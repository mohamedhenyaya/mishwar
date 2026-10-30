import { ConflictException } from '@nestjs/common';
import { EntityManager, Not } from 'typeorm';
import { Driver } from './entities/driver.entity';

// Un NNI = un seul compte capitaine
export async function assertNniFree(manager: EntityManager, nni: string, exceptDriverId?: string): Promise<void> {
  const taken = await manager.getRepository(Driver).exists({
    where: { nni, ...(exceptDriverId && { id: Not(exceptDriverId) }) },
  });
  if (taken) throw new ConflictException('Ce NNI est déjà associé à un autre compte');
}
