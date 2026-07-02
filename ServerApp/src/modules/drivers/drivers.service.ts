import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus, VehicleType } from './entities/driver.entity';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

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

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  // ── GET /drivers/nearby ───────────────────────────────────────────────────
  // Formule Haversine en SQL pur (pas de PostGIS requis).
  // Rayon terrestre : 6 371 000 m.
  // Précision suffisante pour des distances < 50 km.

  async findNearby(dto: NearbyDriversDto, vehicleTypes?: VehicleType[]): Promise<NearbyDriverResult[]> {
    const radius = dto.radius ?? 5_000;

    const rows = await this.driverRepo.query(
      `
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
        AND ($4::text[] IS NULL OR "vehicleType"::text = ANY($4))
      HAVING
        6371000 * 2 * ASIN(SQRT(
          POWER(SIN((RADIANS($1) - RADIANS(latitude))  / 2), 2) +
          COS(RADIANS($1)) * COS(RADIANS(latitude)) *
          POWER(SIN((RADIANS($2) - RADIANS(longitude)) / 2), 2)
        )) <= $3
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
    return this.findById(id);
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
}