import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { DatabaseModule } from '@/database/database.module';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [DatabaseModule]
})
export class SeedModule {}
