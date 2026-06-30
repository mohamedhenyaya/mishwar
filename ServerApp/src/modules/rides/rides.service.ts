import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    private readonly geolocationGateway: GeolocationGateway,
  ) {}

  async createRide(userId: string, dto: CreateRideDto): Promise<Ride> {
    const ride = this.rideRepo.create({
      userId,
      startLatitude:  dto.startLatitude,
      startLongitude: dto.startLongitude,
      destinationName: dto.destinationName,
      endLatitude:   dto.endLatitude  ?? null,
      endLongitude:  dto.endLongitude ?? null,
      status: RideStatus.PENDING,
    });

    const saved = await this.rideRepo.save(ride);
    this.logger.log(`Course créée: ${saved.id} par user ${userId}`);

    // Notifie les chauffeurs proches via WebSocket
    await this.geolocationGateway.notifyNearbyDrivers(saved);

    return saved;
  }

  async findById(id: string): Promise<Ride | null> {
    return this.rideRepo.findOne({ where: { id } });
  }

  async findByUser(userId: string): Promise<Ride[]> {
    return this.rideRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}