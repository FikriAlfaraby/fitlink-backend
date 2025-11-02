import { Module } from '@nestjs/common';
import { GymService } from './gym.service';
import { GymController } from './gym.controller';
import { DatabaseModule } from '@/database/database.module';
import { StorageService } from '@/storage/storage.service';

@Module({
  controllers: [GymController],
  providers: [GymService, StorageService],
  imports: [DatabaseModule]
})
export class GymModule {}
