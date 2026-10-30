import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { Vehicle, VehicleApprovalStatus } from './entities/vehicle.entity';
import {
  DocumentReviewStatus,
  REQUIRED_DOCUMENT_TYPES,
  VehicleDocument,
  VehicleDocumentType,
} from './entities/vehicle-document.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { DOCUMENTS_DIR } from '../../common/utils/photo-upload.util';
import { heicToJpeg, isHeic, normalizeUploadedImage } from '../../common/utils/heic.util';
import { assertDossierEditable, DOSSIER_LABELS, insuranceValidUntil, latestByType, missingItems } from './dossier.util';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { RejectVehicleDto } from './dto/reject-vehicle.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { AdminVehiclesQueryDto } from './dto/admin-vehicles-query.dto';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
import { loadParties } from '../../common/utils/admin-parties.util';
import { updateDriverVehicle } from './driver-vehicle.util';
import { DriversService } from '../drivers/drivers.service';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehicleDocument)
    private readonly documentRepo: Repository<VehicleDocument>,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ═══════════════════════════ Espace chauffeur ══════════════════════════════

  // Dossier vu par le capitaine : statut, pièces envoyées, pièces manquantes, fin d'assurance
  async findMine(driverId: string) {
    const vehicle = await this.findByDriverOrThrow(driverId);
    return this.withDossier(vehicle);
  }

  async updateOwn(driverId: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    await assertDossierEditable(this.vehicleRepo.manager, driverId);
    const vehicle = await updateDriverVehicle(this.vehicleRepo.manager, driverId, dto, { resetApproval: true });
    await this.drivers().enforceOnlineRules(driverId);
    this.pendingChanged();
    return vehicle;
  }

  // Photo d'une pièce (inscription, pièce refusée, nouvelle assurance) : en attente de vérification
  async submitDocument(driverId: string, dto: SubmitDocumentDto, file: Express.Multer.File, { byAdmin = false } = {}): Promise<VehicleDocument> {
    const vehicle = await this.findByDriverOrThrow(driverId);

    // Pièce déjà validée : figée pour le capitaine (seule l'assurance se renouvelle) ; un admin peut la remplacer
    if (!byAdmin && dto.type !== VehicleDocumentType.INSURANCE) {
      const current = await this.documentRepo.findOne({ where: { vehicleId: vehicle.id, type: dto.type }, order: { createdAt: 'DESC' } });
      if (current?.status === DocumentReviewStatus.APPROVED) throw new ConflictException('Ce document a déjà été validé : il n’est plus modifiable');
    }

    let expiresAt: Date | null = null;
    if (dto.type === VehicleDocumentType.INSURANCE) {
      if (!dto.expiresAt) throw new BadRequestException('Indiquez la date de fin de l’assurance');
      // Valable jusqu'à la fin du jour indiqué
      expiresAt = new Date(`${dto.expiresAt.slice(0, 10)}T23:59:59Z`);
      if (expiresAt < new Date()) throw new BadRequestException('Cette assurance est déjà expirée');
    }

    const document = await this.documentRepo.save(this.documentRepo.create({
      vehicleId: vehicle.id,
      type:      dto.type,
      fileUrl:   await normalizeUploadedImage(file), // HEIC (iPhone) → JPEG lisible par les admins
      expiresAt,
    }));
    // Dossier refusé puis complété : il repart en vérification
    if (vehicle.status === VehicleApprovalStatus.REJECTED) {
      await this.vehicleRepo.update(vehicle.id, { status: VehicleApprovalStatus.PENDING, rejectedReason: null });
    }
    this.pendingChanged();
    if (byAdmin) this.dossierChanged(driverId, { event: 'UPDATED' });
    return document;
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async findAllForAdmin(query: AdminVehiclesQueryDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.vehicleRepo.createQueryBuilder('v').orderBy('v.createdAt', 'DESC');
    if (query.status)   qb.andWhere('v.status = :status', { status: query.status });
    if (query.driverId) qb.andWhere('v."driverId" = :driverId', { driverId: query.driverId });

    const [vehicles, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const party = await loadParties(
      this.vehicleRepo.manager,
      vehicles.map((v) => ({ type: 'driver', id: v.driverId })),
    );
    const data = vehicles.map((v) => ({ ...v, driver: party('driver', v.driverId) }));
    return { data, total, page, limit };
  }

  async findByIdForAdmin(id: string) {
    const vehicle = await this.findByIdOrThrow(id);
    const party = await loadParties(this.vehicleRepo.manager, [{ type: 'driver', id: vehicle.driverId }]);
    return { ...(await this.withDossier(vehicle)), driver: party('driver', vehicle.driverId) };
  }

  // Approuver le dossier = toutes les pièces sont là : les dernières en attente sont validées avec lui
  async approve(id: string): Promise<Vehicle> {
    const vehicle = await this.findByIdOrThrow(id);
    const { documents, missing } = await this.withDossier(vehicle);
    if (missing.length) {
      throw new ConflictException(`Dossier incomplet : ${missing.map((m) => DOSSIER_LABELS[m]).join(', ')}`);
    }
    const toApprove = [...latestByType(documents).values()]
      .filter((d) => REQUIRED_DOCUMENT_TYPES.includes(d.type) && d.status === DocumentReviewStatus.PENDING)
      .map((d) => d.id);
    if (toApprove.length) await this.documentRepo.update({ id: In(toApprove) }, { status: DocumentReviewStatus.APPROVED });

    await this.vehicleRepo.update(id, { status: VehicleApprovalStatus.APPROVED, rejectedReason: null });
    this.pendingChanged();
    this.dossierChanged(vehicle.driverId, { event: 'ACCOUNT_APPROVED' });
    return this.findByIdOrThrow(id);
  }

  // Un véhicule rejeté ne roule plus : le capitaine en ligne passe hors ligne
  async reject(id: string, dto: RejectVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findByIdOrThrow(id);
    await this.vehicleRepo.update(id, {
      status:         VehicleApprovalStatus.REJECTED,
      rejectedReason: dto.reason,
    });
    await this.drivers().enforceOnlineRules(vehicle.driverId);
    this.pendingChanged();
    this.dossierChanged(vehicle.driverId, { event: 'DOSSIER_REJECTED', reason: dto.reason });
    return this.findByIdOrThrow(id);
  }

  async reviewDocument(documentId: string, dto: ReviewDocumentDto): Promise<VehicleDocument> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document non trouvé');

    await this.documentRepo.update(documentId, {
      status:     dto.status,
      reviewNote: dto.reviewNote ?? null,
    });
    // Assurance refusée ou remplacée : le capitaine en ligne peut ne plus avoir le droit de rouler
    const vehicle = await this.findByIdOrThrow(document.vehicleId);
    await this.drivers().enforceOnlineRules(vehicle.driverId);
    this.pendingChanged();
    this.dossierChanged(vehicle.driverId, {
      event: 'DOCUMENT_REVIEWED', type: document.type, status: dto.status, note: dto.reviewNote ?? null,
    });
    return this.documentRepo.findOne({ where: { id: documentId } }) as Promise<VehicleDocument>;
  }

  // Fichier d'une pièce : admins, ou le capitaine propriétaire (jamais servi en statique)
  async documentFile(documentId: string, ownerDriverId?: string): Promise<string> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document non trouvé');
    if (ownerDriverId) {
      const vehicle = await this.findByIdOrThrow(document.vehicleId);
      if (vehicle.driverId !== ownerDriverId) throw new NotFoundException('Document non trouvé');
    }
    let path = join(DOCUMENTS_DIR, basename(document.fileUrl));
    if (!existsSync(path)) throw new NotFoundException('Fichier introuvable');
    // Pièce reçue en HEIC avant la conversion à l'arrivée : convertie une fois, à la première lecture
    if (isHeic(document.fileUrl)) {
      const fileUrl = await heicToJpeg(path);
      await this.documentRepo.update(document.id, { fileUrl });
      path = join(DOCUMENTS_DIR, fileUrl);
    }
    return path;
  }

  // ── Utilitaires internes ────────────────────────────────────────────────────

  // Résolu à l'appel : DriversModule dépend (indirectement) de VehiclesModule
  private drivers(): DriversService {
    return this.moduleRef.get(DriversService, { strict: false });
  }

  private pendingChanged(): void {
    this.moduleRef.get(GeolocationGateway, { strict: false }).notifyAdminsPendingChanged();
  }

  // Décision ou modification d'un admin : l'app du capitaine recharge son profil (et l'avertit)
  private dossierChanged(driverId: string, payload: Record<string, unknown>): void {
    this.moduleRef.get(GeolocationGateway, { strict: false }).notifyDriverDossierChanged(driverId, payload);
  }

  private async withDossier(vehicle: Vehicle) {
    const manager = this.vehicleRepo.manager;
    const documents = await this.documentRepo.find({ where: { vehicleId: vehicle.id }, order: { createdAt: 'DESC' } });
    const driver = await manager.getRepository(Driver).findOne({
      where: { id: vehicle.driverId },
      select: { id: true, photoUrl: true, firstName: true, lastName: true, nni: true },
    });
    return {
      ...vehicle,
      documents,
      identity:            { firstName: driver?.firstName ?? null, lastName: driver?.lastName ?? null, nni: driver?.nni ?? null },
      missing:             missingItems(documents, {
        hasIdentity:     !!(driver?.firstName && driver.lastName && driver.nni),
        hasProfilePhoto: !!driver?.photoUrl,
      }),
      insuranceValidUntil: await insuranceValidUntil(manager, vehicle.id),
    };
  }

  private async findByIdOrThrow(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Véhicule non trouvé');
    return vehicle;
  }

  private async findByDriverOrThrow(driverId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { driverId } });
    if (!vehicle) throw new NotFoundException('Véhicule non trouvé');
    return vehicle;
  }
}
