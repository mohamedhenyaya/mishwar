import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Journal d'audit des actions administrateur — traçabilité, aucune relation TypeORM
@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  adminId: string;

  @Column()
  action: string;

  @Column()
  targetType: string;

  @Column({ type: 'uuid', nullable: true })
  targetId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
