import {
  BadRequestException, ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Driver, DriverStatus, VehicleType } from './entities/driver.entity';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { AdminUpdateDriverDto, UpdateDriverDto } from './dto/update-driver.dto';
import { IdentityDto } from './dto/identity.dto';
import { assertNniFree } from './identity.util';
import { blockedMessage, blockedUntilFrom } from '../../common/utils/account-block.util';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { ACTIVE_RIDE_STATUSES, Ride, RideStatus } from '../rides/entities/ride.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import {
  WalletOwnerType,
  WalletTransaction,
  WalletTransactionType,
} from '../wallet/entities/wallet-transaction.entity';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
import { Vehicle, VehicleApprovalStatus } from '../vehicles/entities/vehicle.entity';
import { createDriverVehicle, DriverVehicleInput, updateDriverVehicle } from '../vehicles/driver-vehicle.util';
import {
  assertDossierEditable, INCOMPLETE_SQL, insuranceValidUntil, missingItems, TO_REVIEW_SQL, VALID_INSURANCE_SQL,
} from '../vehicles/dossier.util';
import { VehicleDocument } from '../vehicles/entities/vehicle-document.entity';

// code lu par CapitainApp pour rediriger vers « Mon compte »
export function insufficientBalanceError(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error:      'Forbidden',
    code:       'INSUFFICIENT_BALANCE',
    message:    'Votre solde est insuffisant : rechargez votre compte pour passer en ligne',
  });
}

// Compte (dossier : véhicule + pièces) pas encore approuvé ou refusé par un admin
export function vehicleNotApprovedError(vehicle: Vehicle | null): ForbiddenException {
  const message = vehicle?.status === VehicleApprovalStatus.REJECTED
    ? `Votre dossier a été refusé${vehicle.rejectedReason ? ` : ${vehicle.rejectedReason}` : ''}. Corrigez-le depuis « Mon profil » pour passer en ligne`
    : 'Votre compte est en cours de vérification par notre équipe : vous pourrez passer en ligne une fois votre dossier approuvé';
  return new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'VEHICLE_NOT_APPROVED', message });
}

// Le compte n'est valable que jusqu'à la fin de l'assurance validée
export function insuranceExpiredError(validUntil: Date | null): ForbiddenException {
  const message = validUntil
    ? `Votre assurance a expiré le ${validUntil.toLocaleDateString('fr-FR', { timeZone: 'UTC' })} : envoyez la nouvelle depuis « Mon profil »`
    : 'Aucune assurance validée : envoyez votre assurance depuis « Mon profil »';
  return new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'INSURANCE_EXPIRED', message });
}

export interface NearbyDriverResult {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  vehicleType: string;
  rating: number;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

const INSURANCE_CHECK_MS = 60 * 60 * 1_000;

@Injectable()
export class DriversService implements OnModuleInit {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @Inject(forwardRef(() => GeolocationGateway))
    private readonly geolocationGateway: GeolocationGateway,
  ) {}

  // ── GET /drivers/nearby ───────────────────────────────────────────────────
  // Formule Haversine en SQL pur (pas de PostGIS requis).
  // Rayon terrestre : 6 371 000 m.
  // Précision suffisante pour des distances < 50 km.

  async findNearby(dto: NearbyDriversDto, vehicleTypes?: VehicleType[]): Promise<NearbyDriverResult[]> {
    const radius = dto.radius ?? 5_000;

    const rows = await this.driverRepo.query(
      `
      SELECT * FROM (
        SELECT
          id,
          name,
          phone,
          status,
          "vehicleType",
          rating,
          latitude,
          longitude,
          6371000 * 2 * ASIN(SQRT(
            POWER(SIN((RADIANS($1) - RADIANS(latitude))  / 2), 2) +
            COS(RADIANS($1)) * COS(RADIANS(latitude)) *
            POWER(SIN((RADIANS($2) - RADIANS(longitude)) / 2), 2)
          )) AS "distanceMeters"
        FROM drivers
        WHERE
          status     = 'ONLINE'
          AND latitude  IS NOT NULL
          AND longitude IS NOT NULL
          AND "isActive" = true
          AND balance >= 0
          AND EXISTS (SELECT 1 FROM vehicles v WHERE v."driverId" = drivers.id AND v.status = 'APPROVED')
          AND ${VALID_INSURANCE_SQL}
          AND ($4::text[] IS NULL OR "vehicleType"::text = ANY($4))
      ) AS nearby
      WHERE "distanceMeters" <= $3
      ORDER BY "distanceMeters" ASC
      LIMIT 20
      `,
      [dto.lat, dto.lng, radius, vehicleTypes ?? null],
    );

    return rows.map((r: any) => ({
      ...r,
      latitude:       parseFloat(r.latitude),
      longitude:      parseFloat(r.longitude),
      distanceMeters: parseFloat(r.distanceMeters),
      rating:         parseFloat(r.rating),
    }));
  }

  // ── PATCH /drivers/location ────────────────────────────────────────────────

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<void> {
    await this.driverRepo.update(id, {
      latitude:           dto.latitude,
      longitude:          dto.longitude,
      lastLocationUpdate: new Date(),
    });
  }

  // ── PATCH /drivers/status ─────────────────────────────────────────────────

  async updateStatus(id: string, status: DriverStatus): Promise<Driver> {
    await this.driverRepo.update(id, { status });
    // Diffusé à tous les clients : carte et compteur de chauffeurs disponibles à jour en direct
    this.geolocationGateway.notifyDriverStatus(id, status);
    return this.findById(id);
  }

  // ── Peut travailler : solde positif ou nul ET véhicule approuvé ───────────

  // Raison qui empêche le capitaine d'être en ligne et de prendre des courses (null = aucune)
  async onlineBlocker(driver: Driver): Promise<ForbiddenException | null> {
    if (Number(driver.balance) < 0) return insufficientBalanceError();
    const vehicle = await this.driverRepo.manager.getRepository(Vehicle).findOne({ where: { driverId: driver.id } });
    if (!vehicle || vehicle.status !== VehicleApprovalStatus.APPROVED) return vehicleNotApprovedError(vehicle);
    const validUntil = await insuranceValidUntil(this.driverRepo.manager, vehicle.id);
    if (!validUntil || validUntil < new Date()) return insuranceExpiredError(validUntil);
    return null;
  }

  // Assurance arrivée à échéance : les capitaines en ligne concernés passent hors ligne
  // (le passage en ligne et l'acceptation de courses sont déjà refusés par onlineBlocker)
  onModuleInit(): void {
    const timer = setInterval(() => { void this.stopExpiredInsurances(); }, INSURANCE_CHECK_MS);
    timer.unref();
  }

  private async stopExpiredInsurances(): Promise<void> {
    const rows: { id: string }[] = await this.driverRepo.query(
      `SELECT id FROM drivers WHERE status = 'ONLINE' AND NOT ${VALID_INSURANCE_SQL}`,
    );
    for (const { id } of rows) await this.enforceOnlineRules(id).catch(() => undefined);
  }

  // Passage en ligne demandé par le capitaine
  async updateStatusByDriver(id: string, status: DriverStatus): Promise<Driver> {
    if (status === DriverStatus.ONLINE) {
      const blocker = await this.onlineBlocker(await this.findById(id));
      if (blocker) throw blocker;
    }
    return this.updateStatus(id, status);
  }

  // Fin de course (terminée ou annulée) : de nouveau disponible, sauf si un blocage est apparu
  async makeAvailable(id: string): Promise<void> {
    const blocker = await this.onlineBlocker(await this.findById(id));
    await this.updateStatus(id, blocker ? DriverStatus.OFFLINE : DriverStatus.ONLINE);
    if (blocker) this.notifyForcedOffline(id, blocker);
  }

  // Solde passé sous zéro, véhicule rejeté ou renvoyé en validation : hors ligne immédiatement.
  // En course (BUSY), c'est makeAvailable qui s'en charge à la fin de la course.
  async enforceOnlineRules(id: string): Promise<void> {
    const driver = await this.findById(id);
    if (driver.status !== DriverStatus.ONLINE) return;
    const blocker = await this.onlineBlocker(driver);
    if (!blocker) return;
    await this.updateStatus(id, DriverStatus.OFFLINE);
    this.notifyForcedOffline(id, blocker);
  }

  private notifyForcedOffline(id: string, blocker: ForbiddenException): void {
    const { code, message } = blocker.getResponse() as { code: string; message: string };
    this.geolocationGateway.notifyCustom(`driver:${id}`, 'driver:forced-offline', { code, message });
  }

  // ── Utilitaire interne ────────────────────────────────────────────────────

  async findById(id: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) throw new NotFoundException('Chauffeur non trouvé');
    return driver;
  }

  async incrementTotalRides(id: string): Promise<void> {
    await this.driverRepo.increment({ id }, 'totalRides', 1);
  }

  // PATCH /drivers/me et POST /drivers/me/photo — profil visible par le client.
  // Changer de véhicule le renvoie en validation admin.
  async updateProfile(id: string, dto: UpdateDriverDto & { photoUrl?: string }): Promise<Driver> {
    if (Object.keys(dto).length) await assertDossierEditable(this.driverRepo.manager, id);
    await this.saveProfileAndVehicle(id, dto, true);
    await this.enforceOnlineRules(id); // véhicule modifié → repasse en validation
    return this.findById(id);
  }

  // PATCH /drivers/me/identity — modifiable tant que le compte n'est pas approuvé
  async updateIdentity(id: string, dto: IdentityDto): Promise<Driver> {
    const vehicle = await assertDossierEditable(this.driverRepo.manager, id);
    await assertNniFree(this.driverRepo.manager, dto.nni, id);
    const firstName = dto.firstName.trim();
    const lastName  = dto.lastName.trim();
    // Le nom affiché au client suit l'identité du dossier
    await this.driverRepo.update(id, { firstName, lastName, nni: dto.nni, name: `${firstName} ${lastName}` });
    if (vehicle?.status === VehicleApprovalStatus.REJECTED) {
      await this.driverRepo.manager.getRepository(Vehicle).update(vehicle.id, { status: VehicleApprovalStatus.PENDING, rejectedReason: null });
    }
    this.geolocationGateway.notifyAdminsPendingChanged();
    return this.findById(id);
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async createByAdmin(dto: CreateDriverDto): Promise<Driver> {
    const existing = await this.driverRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Un chauffeur avec ce numéro existe déjà');

    await assertNniFree(this.driverRepo.manager, dto.nni);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const firstName = dto.firstName.trim();
    const lastName  = dto.lastName.trim();
    // Comme à l'inscription : le compte reste en attente jusqu'à l'approbation du dossier complet
    // (pièces envoyées ensuite par l'admin, ou par le capitaine depuis l'application)
    const driverId = await this.driverRepo.manager.transaction(async (manager) => {
      const driver = await manager.getRepository(Driver).save(manager.getRepository(Driver).create({
        phone: dto.phone, passwordHash, firstName, lastName, nni: dto.nni, name: `${firstName} ${lastName}`,
      }));
      await createDriverVehicle(manager, driver.id, {
        type:        VehicleType.SEDAN,
        make:        dto.vehicleMake.trim(),
        model:       dto.vehicleModel.trim(),
        year:        dto.vehicleYear,
        fuelType:    dto.vehicleFuel,
        plateNumber: dto.vehiclePlate,
      }, VehicleApprovalStatus.PENDING);
      return driver.id;
    });
    this.geolocationGateway.notifyAdminsPendingChanged();
    return this.findById(driverId);
  }

  // Photo de profil envoyée par un admin (création du dossier depuis le back-office)
  async setPhotoByAdmin(id: string, photoUrl: string): Promise<Driver> {
    await this.findById(id);
    await this.driverRepo.update(id, { photoUrl });
    this.geolocationGateway.notifyAdminsPendingChanged();
    this.geolocationGateway.notifyDriverDossierChanged(id, { event: 'UPDATED' });
    return this.findById(id);
  }

  async updateByAdmin(id: string, dto: AdminUpdateDriverDto): Promise<Driver> {
    await this.findById(id);
    if (dto.nni) await assertNniFree(this.driverRepo.manager, dto.nni, id);
    await this.saveProfileAndVehicle(id, dto, false);
    await this.enforceOnlineRules(id);
    this.geolocationGateway.notifyDriverDossierChanged(id, { event: 'UPDATED' });
    return this.findById(id);
  }

  // Bloquer en pleine course laisserait le client sans chauffeur : l'admin doit d'abord
  // annuler (ou laisser terminer) la course en cours
  async block(id: string, reason?: string, durationMinutes?: number): Promise<Driver> {
    await this.findById(id);
    await this.assertNoActiveRide(id, 'Ce chauffeur a une course en cours — annulez-la avant de le bloquer');

    await this.driverRepo.update(id, {
      isActive:      false,
      blockedReason: reason ?? null,
      blockedAt:     new Date(),
      blockedUntil:  blockedUntilFrom(durationMinutes),
      status:        DriverStatus.OFFLINE,
    });
    await this.revokeSessions(id);
    const blocked = await this.findById(id);
    this.geolocationGateway.notifyAccountBlocked(`driver:${id}`, blockedMessage(blocked));
    this.geolocationGateway.notifyDriverStatus(id, DriverStatus.OFFLINE);
    return this.findById(id);
  }

  async unblock(id: string): Promise<Driver> {
    const driver = await this.findById(id);
    if (driver.deletedAt) throw new BadRequestException('Ce compte a été supprimé');
    await this.driverRepo.update(id, { isActive: true, blockedReason: null, blockedAt: null, blockedUntil: null });
    return this.findById(id);
  }

  async resetPasswordByAdmin(id: string, newPassword: string): Promise<{ message: string }> {
    const driver = await this.findById(id);
    if (driver.deletedAt) throw new BadRequestException('Ce compte a été supprimé');
    await this.driverRepo.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    await this.revokeSessions(id);
    return { message: 'Mot de passe réinitialisé' };
  }

  // Anonymisation plutôt qu'effacement : courses, gains et commissions restent traçables
  async softDelete(id: string): Promise<{ message: string }> {
    const driver = await this.findById(id);
    if (driver.deletedAt) throw new BadRequestException('Ce compte est déjà supprimé');
    await this.assertNoActiveRide(id, 'Ce chauffeur a une course en cours — annulez-la avant de supprimer le compte');

    const now = new Date();
    await this.driverRepo.update(id, {
      phone:         `deleted:${now.getTime()}:${driver.phone}`,
      name:          'Compte supprimé',
      firstName:     null,
      lastName:      null,
      nni:           null,
      photoUrl:      null as unknown as string,
      passwordHash:  null as unknown as string,
      deviceToken:   null,
      status:        DriverStatus.OFFLINE,
      latitude:      null,
      longitude:     null,
      isActive:      false,
      blockedReason: 'Compte supprimé',
      blockedAt:     driver.blockedAt ?? now,
      blockedUntil:  null,
      deletedAt:     now,
    });
    // Libère la plaque, comme le numéro, pour qu'un autre capitaine puisse enregistrer ce véhicule
    const vehicleRepo = this.driverRepo.manager.getRepository(Vehicle);
    const vehicle = await vehicleRepo.findOne({ where: { driverId: id } });
    if (vehicle) {
      await vehicleRepo.update(vehicle.id, { plateNumber: `deleted:${now.getTime()}:${vehicle.plateNumber}` });
    }
    await this.revokeSessions(id);
    this.geolocationGateway.notifyAccountBlocked(`driver:${id}`, 'Compte supprimé');
    this.geolocationGateway.notifyDriverStatus(id, DriverStatus.OFFLINE);
    this.geolocationGateway.notifyAdminsPendingChanged();
    return { message: 'Compte supprimé' };
  }

  async findAllPaginated(query: AdminDriversQueryDto): Promise<PaginatedResult<Driver>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    // Un capitaine = un véhicule : chaque ligne porte son véhicule (driver.vehicle)
    const qb = this.driverRepo
      .createQueryBuilder('driver')
      .leftJoinAndMapOne('driver.vehicle', Vehicle, 'vehicle', 'vehicle.driverId = driver.id')
      .where('driver.deletedAt IS NULL')
      .orderBy('driver.createdAt', 'DESC');
    if (query.status)      qb.andWhere('driver.status = :status', { status: query.status });
    if (query.vehicleStatus) qb.andWhere('vehicle.status = :vehicleStatus', { vehicleStatus: query.vehicleStatus });
    if (query.toReview === 'true') qb.andWhere(TO_REVIEW_SQL);
    if (query.incomplete === 'true') qb.andWhere(INCOMPLETE_SQL);
    if (query.insuranceExpired === 'true') {
      qb.andWhere(`vehicle.status = 'APPROVED' AND NOT EXISTS (
        SELECT 1 FROM vehicle_documents vd WHERE vd."vehicleId" = vehicle.id
          AND vd.type = 'INSURANCE' AND vd.status = 'APPROVED' AND vd."expiresAt" >= timezone('UTC', now()))`);
    }
    // Actif = peut travailler (dossier approuvé) ; en cours de validation = ni approuvé ni bloqué
    if (query.account === 'active')  qb.andWhere(`driver.isActive = true AND vehicle.status = 'APPROVED'`);
    if (query.account === 'pending') qb.andWhere(`driver.isActive = true AND (vehicle.status IS NULL OR vehicle.status <> 'APPROVED')`);
    if (query.account === 'blocked') qb.andWhere('driver.isActive = false');
    if (query.isActive !== undefined) {
      qb.andWhere('driver.isActive = :isActive', { isActive: query.isActive === 'true' });
    }
    if (query.search) {
      qb.andWhere('(driver.name ILIKE :s OR driver.phone ILIKE :s OR driver.vehiclePlate ILIKE :s OR driver.nni ILIKE :s)', {
        s: `%${query.search.trim()}%`,
      });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    // Résumé du dossier par ligne (colonne « Dossier ») : pièces à vérifier, éléments manquants,
    // fin d'assurance validée — mêmes règles que le dossier détaillé (missingItems)
    const vehicleIds = data.map((d) => (d as Driver & { vehicle?: Vehicle }).vehicle?.id).filter(Boolean) as string[];
    const documents = vehicleIds.length
      ? await this.driverRepo.manager.getRepository(VehicleDocument).find({ where: { vehicleId: In(vehicleIds) } })
      : [];
    const rows = data.map((d) => {
      const vehicle = (d as Driver & { vehicle?: Vehicle }).vehicle;
      const docs = vehicle ? documents.filter((doc) => doc.vehicleId === vehicle.id) : [];
      const insurance = docs
        .filter((doc) => doc.type === 'INSURANCE' && doc.status === 'APPROVED' && doc.expiresAt)
        .map((doc) => doc.expiresAt!.getTime());
      return {
        ...d,
        dossier: {
          pendingDocuments:    docs.filter((doc) => doc.status === 'PENDING').length,
          missing:             missingItems(docs, { hasIdentity: !!(d.firstName && d.lastName && d.nni), hasProfilePhoto: !!d.photoUrl }).length,
          insuranceValidUntil: insurance.length ? new Date(Math.max(...insurance)) : null,
        },
      };
    });
    return { data: rows, total, page, limit };
  }

  // Carte en direct du back-office : chauffeurs connectés ayant une position connue
  async findLiveForAdmin(): Promise<Driver[]> {
    return this.driverRepo
      .createQueryBuilder('driver')
      .where('driver.status IN (:...statuses)', { statuses: [DriverStatus.ONLINE, DriverStatus.BUSY] })
      .andWhere('driver.isActive = true')
      .andWhere('driver.latitude IS NOT NULL AND driver.longitude IS NOT NULL')
      .orderBy('driver.lastLocationUpdate', 'DESC')
      .getMany();
  }

  async getStats(id: string) {
    const driver = await this.findById(id);
    const rideRepo = this.driverRepo.manager.getRepository(Ride);

    const statusCounts = await rideRepo
      .createQueryBuilder('ride')
      .select('ride.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ride.driverId = :id', { id })
      .groupBy('ride.status')
      .getRawMany();

    const ridesByStatus: Record<string, number> = {};
    let totalRides = 0;
    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      ridesByStatus[row.status] = count;
      totalRides += count;
    }

    const earnedRow = await rideRepo
      .createQueryBuilder('ride')
      .select('COALESCE(SUM(ride.price), 0)', 'total')
      .where('ride.driverId = :id AND ride.status = :status', { id, status: RideStatus.COMPLETED })
      .getRawOne();

    const txRepo = this.driverRepo.manager.getRepository(WalletTransaction);
    const commissionRow = await txRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(-tx.amount), 0)', 'total')
      .where('tx.ownerType = :ownerType AND tx.ownerId = :id AND tx.type = :type', {
        ownerType: WalletOwnerType.DRIVER,
        id,
        type: WalletTransactionType.COMMISSION_DEDUCTION,
      })
      .getRawOne();

    return {
      driver,
      totalRides,
      ridesByStatus,
      totalEarned:         parseFloat(earnedRow.total),
      totalCommissionPaid: parseFloat(commissionRow.total),
      balance:              Number(driver.balance),
    };
  }

  private async assertNoActiveRide(driverId: string, message: string): Promise<void> {
    const activeRide = await this.driverRepo.manager
      .getRepository(Ride)
      .findOne({ where: { driverId, status: In(ACTIVE_RIDE_STATUSES) } });
    if (activeRide) throw new ConflictException(message);
  }

  private async saveProfileAndVehicle(
    id: string,
    dto: UpdateDriverDto & { photoUrl?: string },
    resetApproval: boolean,
  ): Promise<void> {
    const { vehicleType, vehicleModel, vehiclePlate, ...profile } = dto;
    const vehicle: Partial<DriverVehicleInput> = {
      ...(vehicleType  !== undefined && { type: vehicleType }),
      ...(vehicleModel !== undefined && { model: vehicleModel, make: null }),
      ...(vehiclePlate !== undefined && { plateNumber: vehiclePlate }),
    };
    await this.driverRepo.manager.transaction(async (manager) => {
      if (Object.keys(profile).length) await manager.getRepository(Driver).update(id, profile);
      if (Object.keys(vehicle).length) await updateDriverVehicle(manager, id, vehicle, { resetApproval });
    });
  }

  private async revokeSessions(ownerId: string): Promise<void> {
    await this.driverRepo.manager
      .getRepository(RefreshToken)
      .update({ ownerId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
