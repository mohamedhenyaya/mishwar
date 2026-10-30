import { Client } from 'pg';

// Passage de « plusieurs véhicules par capitaine » à « un capitaine = un véhicule ».
// Tourne avant le synchronize de TypeORM, qui échouerait sinon en posant la contrainte
// unique sur vehicles."driverId". Sans effet sur une base neuve ou déjà à jour.
export async function prepareVehiclesOneToOne(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const client = new Client(url
    ? { connectionString: url, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false }
    : {
        host:     process.env.DB_HOST ?? 'localhost',
        port:     Number(process.env.DB_PORT ?? 5432),
        user:     process.env.DB_USERNAME ?? 'vtc_user',
        password: process.env.DB_PASSWORD ?? 'vtc_password',
        database: process.env.DB_NAME ?? 'vtc_db',
      });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles'`,
    );
    const columns = new Set(rows.map((r) => r.column_name));
    if (columns.size === 0) return;

    await client.query('BEGIN');
    await client.query(`ALTER TABLE vehicles ALTER COLUMN make DROP NOT NULL, ALTER COLUMN year DROP NOT NULL`);

    // Un seul véhicule gardé par capitaine : l'actif, sinon l'approuvé, sinon le plus récent
    const order = `${columns.has('isActive') ? '"isActive" DESC, ' : ''}(status = 'APPROVED') DESC, "createdAt" DESC`;
    const extra = `SELECT id FROM (
      SELECT id, row_number() OVER (PARTITION BY "driverId" ORDER BY ${order}) AS rn FROM vehicles
    ) ranked WHERE rn > 1`;
    // … et pas de véhicule sans capitaine
    const orphan = `SELECT v.id FROM vehicles v WHERE NOT EXISTS (SELECT 1 FROM drivers d WHERE d.id = v."driverId")`;
    await client.query(`DELETE FROM vehicle_documents WHERE "vehicleId" IN (${extra}) OR "vehicleId" IN (${orphan})`);
    const removed = await client.query(`DELETE FROM vehicles WHERE id IN (${extra}) OR id IN (${orphan})`);

    // Capitaines sans véhicule : créé depuis leurs colonnes Driver, en attente de validation.
    // Plaque absente ou déjà prise → plaque provisoire « A-COMPLETER-… » à corriger par l'admin.
    const added = await client.query(`
      INSERT INTO vehicles ("driverId", type, model, "plateNumber", status)
      SELECT id, "vehicleType"::text::vehicles_type_enum, model,
             CASE WHEN plate IS NULL OR rn > 1 OR EXISTS (SELECT 1 FROM vehicles v WHERE v."plateNumber" = plate)
                  THEN 'A-COMPLETER-' || left(id::text, 8) ELSE plate END,
             'PENDING'
      FROM (
        SELECT d.id, d."vehicleType",
               COALESCE(NULLIF(trim(d."vehicleModel"), ''), 'À compléter') AS model,
               NULLIF(upper(trim(d."vehiclePlate")), '') AS plate,
               row_number() OVER (PARTITION BY NULLIF(upper(trim(d."vehiclePlate")), '') ORDER BY d."createdAt") AS rn
        FROM drivers d
        WHERE NOT EXISTS (SELECT 1 FROM vehicles v WHERE v."driverId" = d.id)
      ) missing`);

    // Le véhicule fait foi : Driver en garde une copie pour le matching des courses
    await client.query(`
      UPDATE drivers d SET "vehicleType"  = v.type::text::drivers_vehicletype_enum,
                           "vehicleModel" = concat_ws(' ', v.make, v.model),
                           "vehiclePlate" = v."plateNumber"
      FROM vehicles v WHERE v."driverId" = d.id`);

    // En ligne sans pouvoir travailler (dossier non approuvé, assurance expirée, solde négatif) : hors ligne
    await client.query(`
      UPDATE drivers d SET status = 'OFFLINE'
      WHERE d.status = 'ONLINE'
        AND (d.balance < 0
          OR NOT EXISTS (SELECT 1 FROM vehicles v WHERE v."driverId" = d.id AND v.status = 'APPROVED')
          OR NOT EXISTS (
            SELECT 1 FROM vehicles v JOIN vehicle_documents vd ON vd."vehicleId" = v.id
            WHERE v."driverId" = d.id AND vd.type = 'INSURANCE' AND vd.status = 'APPROVED' AND vd."expiresAt" >= timezone('UTC', now())))`);
    await client.query('COMMIT');

    if (removed.rowCount || added.rowCount) {
      console.log(`Véhicules 1-1 : ${removed.rowCount} véhicule(s) en trop supprimé(s), ${added.rowCount} créé(s)`);
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    await client.end();
  }
}
