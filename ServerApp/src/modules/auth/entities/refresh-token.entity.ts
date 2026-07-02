import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Jeton opaque remis au client ; seul son hash SHA-256 (déterministe, pour permettre la recherche
// par jeton) est stocké — jamais le jeton en clair. Contrairement à bcrypt (mots de passe à faible
// entropie), un hash déterministe est ici correct et nécessaire puisque le jeton est déjà aléatoire.
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  // 'user' | 'driver' | 'admin' — reflète exactement le rôle du payload JWT
  @Column()
  role: string;

  @Column()
  phone: string;

  @Column()
  tokenHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
