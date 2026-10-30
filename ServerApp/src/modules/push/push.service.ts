import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { DeviceOwnerType, DevicePlatform, DeviceToken } from '../notifications/entities/device-token.entity';

// Jeton refusé par Firebase : appli désinstallée ou jeton renouvelé → supprimé de device_tokens
const DEAD_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// Messages « données » Firebase Cloud Messaging vers l'app capitaine (Android).
// Ils réveillent l'app même fermée : elle affiche alors l'écran d'appel « Nouvelle course ».
// Clé du compte de service : FIREBASE_SERVICE_ACCOUNT (contenu JSON, ex. Railway)
// ou FIREBASE_SERVICE_ACCOUNT_PATH (chemin du fichier, en local). Absente → push désactivé.
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private messaging: Messaging | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
  ) {}

  onModuleInit(): void {
    const account = this.loadServiceAccount();
    if (!account) {
      this.logger.warn('Push désactivé : FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_PATH absent');
      return;
    }
    this.messaging = getMessaging(initializeApp({ credential: cert(account) }, 'push'));
    this.logger.log('Push Firebase activé');
  }

  private loadServiceAccount(): ServiceAccount | null {
    const json = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    try {
      if (json) return JSON.parse(json) as ServiceAccount;
      if (path) return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount;
    } catch (err: any) {
      this.logger.error(`Clé de compte de service Firebase illisible : ${err.message}`);
    }
    return null;
  }

  // Le capitaine a un appareil capable de recevoir l'écran de course app fermée
  async driverHasDevice(driverId: string): Promise<boolean> {
    if (!this.messaging) return false;
    return this.deviceTokenRepo.exist({
      where: { ownerType: DeviceOwnerType.DRIVER, ownerId: driverId, platform: DevicePlatform.ANDROID },
    });
  }

  // Envoi prioritaire, sans notification affichée par le système : c'est l'app qui décide de l'écran.
  // ttlMs : au-delà, Firebase abandonne (une demande de course expirée ne doit plus sonner).
  async sendToDrivers(driverIds: string[], data: Record<string, string>, ttlMs: number): Promise<void> {
    if (!this.messaging || driverIds.length === 0) return;
    const devices = await this.deviceTokenRepo.find({
      where: { ownerType: DeviceOwnerType.DRIVER, ownerId: In(driverIds), platform: DevicePlatform.ANDROID },
    });
    if (devices.length === 0) return;

    try {
      const result = await this.messaging.sendEachForMulticast({
        tokens:  devices.map((d) => d.token),
        data,
        android: { priority: 'high', ttl: ttlMs },
      });
      const dead = result.responses
        .map((r, i) => (!r.success && DEAD_TOKEN_ERRORS.includes(r.error?.code ?? '') ? devices[i].id : null))
        .filter((id): id is string => !!id);
      if (dead.length) await this.deviceTokenRepo.delete(dead);
      if (result.failureCount) {
        this.logger.warn(`Push « ${data.type} » : ${result.failureCount}/${devices.length} échec(s)`);
      }
    } catch (err: any) {
      this.logger.error(`Push « ${data.type} » impossible : ${err.message}`);
    }
  }
}
