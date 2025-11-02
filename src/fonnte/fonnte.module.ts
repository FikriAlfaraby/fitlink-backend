import { Module } from '@nestjs/common';
import { FonnteService } from './fonnte.service';
import { FonnteController } from './fonnte.controller';

@Module({
  controllers: [FonnteController],
  providers: [FonnteService],
  exports: [FonnteService]
})
export class FonnteModule {}
