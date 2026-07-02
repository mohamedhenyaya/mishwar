import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from './entities/platform-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private cached: PlatformSettings | null = null;

  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepo: Repository<PlatformSettings>,
  ) {}

  async getSettings(): Promise<PlatformSettings> {
    if (this.cached) return this.cached;

    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      settings = await this.settingsRepo.save(this.settingsRepo.create());
    }

    this.cached = settings;
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<PlatformSettings> {
    const current = await this.getSettings();
    await this.settingsRepo.update(current.id, dto);
    this.cached = null;
    return this.getSettings();
  }
}
