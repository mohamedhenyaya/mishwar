import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('favorite_places')
export class FavoritePlace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Le propriétaire peut être un user OU un driver — malgré le nom, on stocke le `sub` du JWT peu importe le rôle
  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  label: string;

  @Column()
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;
}
