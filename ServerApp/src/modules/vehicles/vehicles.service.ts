import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleApprovalStatus } from './entities/vehicle.entity';
import { VehicleDocument } from './entities/vehicle-document.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { RejectVehicleDto } from './dto/reject-vehicle.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { AdminVehiclesQueryDto } from './dto/admin-vehicles-query.dto';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehicleDocument)
    private readonly documentRepo: Repository<VehicleDocument>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  // ═══════════════════════════ Espace chauffeur ══════════════════════════════

  async createForDriver(driverId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepo.create({
      ...dto,
      driverId,
      status:   VehicleApprovalStatus.PENDING,
      isActive: false,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findMine(driverId: string): Promise<Vehicle[]> {
    return this.vehicleRepo.find({ where: { driverId }, order: { createdAt: 'DESC' } });
  }

  async updateOwn(id: string, driverId: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.getOwned(id, driverId);
    if (vehicle.status !== VehicleApprovalStatus.PENDING) {
      throw new ConflictException('Seul un véhicule en attente peut être modifié');
    }
    await this.vehicleRepo.update(id, dto);
    return this.findByIdOrThrow(id);
  }

  async activate(id: string, driverId: string): Promise<Vehicle> {
    const vehicle = await this.getOwned(id, driverId);
    if (vehicle.status !== VehicleApprovalStatus.APPROVED) {
      throw new ConflictException('Seul un véhicule approuvé peut être activé');
    }
    await this.activateVehicle(vehicle);
    return this.findByIdOrThrow(id);
  }

  async submitDocument(vehicleId: string, driverId: string, dto: SubmitDocumentDto): Promise<VehicleDocument> {
    await this.getOwned(vehicleId, driverId);
    const document = this.documentRepo.create({
      vehicleId,
      type:      dto.type,
      fileUrl:   dto.fileUrl,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.documentRepo.save(document);
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async findAllForAdmin(query: AdminVehiclesQueryDto): Promise<PaginatedResult<Vehicle>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.vehicleRepo.createQueryBuilder('v').orderBy('v.createdAt', 'DESC');
    if (query.status)   qb.andWhere('v.status = :status', { status: query.status });
    if (query.driverId) qb.andWhere('v."driverId" = :driverId', { driverId: query.driverId });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async findByIdForAdmin(id: string) {
    const vehicle = await this.findByIdOrThrow(id);
    const documents = await this.documentRepo.find({ where: { vehicleId: id } });
    return { ...vehicle, documents };
  }

  async approve(id: string): Promise<Vehicle> {
    const vehicle = await this.findByIdOrThrow(id);
    await this.vehicleRepo.update(id, { status: VehicleApprovalStatus.APPROVED, rejectedReason: null });

    const activeVehicle = await this.vehicleRepo.findOne({
      where: { driverId: vehicle.driverId, isActive: true },
    });
    if (!activeVehicle) {
      await this.activateVehicle(vehicle);
    }

    return this.findByIdOrThrow(id);
  }

  async reject(id: string, dto: RejectVehicleDto): Promise<Vehicle> {
    await this.findByIdOrThrow(id);
    await this.vehicleRepo.update(id, {
      status:         VehicleApprovalStatus.REJECTED,
      rejectedReason: dto.reason,
    });
    return this.findByIdOrThrow(id);
  }

  async reviewDocument(documentId: string, dto: ReviewDocumentDto): Promise<VehicleDocument> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document non trouvé');

    await this.documentRepo.update(documentId, {
      status:     dto.status,
      reviewNote: dto.reviewNote ?? null,
    });
    return this.documentRepo.findOne({ where: { id: documentId } }) as Promise<VehicleDocument>;
  }

  // ── Utilitaires internes ────────────────────────────────────────────────────

  private async findByIdOrThrow(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Véhicule non trouvé');
    return vehicle;
  }

  private async getOwned(id: string, driverId: string): Promise<Vehicle> {
    const vehicle = await this.findByIdOrThrow(id);
    if (vehicle.driverId !== driverId) {
      throw new ForbiddenException('Ce véhicule ne vous appartient pas');
    }
    return vehicle;
  }

  // Active ce véhicule, désactive les autres du même chauffeur, et synchronise
  // les colonnes plates de Driver utilisées pour le matching des courses.
  private async activateVehicle(vehicle: Vehicle): Promise<void> {
    await this.vehicleRepo.update({ driverId: vehicle.driverId }, { isActive: false });
    await this.vehicleRepo.update(vehicle.id, { isActive: true });

    await this.driverRepo.update(vehicle.driverId, {
      vehicleType:  vehicle.type,
      vehicleModel: `${vehicle.make} ${vehicle.model}`,
      vehiclePlate: vehicle.plateNumber,
    });
  }
}
