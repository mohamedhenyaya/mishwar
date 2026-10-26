import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { FavoritePlace } from './entities/favorite-place.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FavoritePlace])],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
