import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { nextAverage } from '../../common/utils/public-profile.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.userRepo.update(id, dto);
    return this.findById(id);
  }

  async setPhoto(id: string, photoUrl: string): Promise<User> {
    await this.userRepo.update(id, { photoUrl });
    return this.findById(id);
  }

  async incrementTotalRides(id: string): Promise<void> {
    await this.userRepo.increment({ id }, 'totalRides', 1);
  }

  async addRating(id: string, rating: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepo.update(id, {
      rating:      nextAverage(user.rating, user.ratingCount, rating),
      ratingCount: user.ratingCount + 1,
    });
  }
}