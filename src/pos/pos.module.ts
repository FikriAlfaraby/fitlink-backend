import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { DatabaseModule } from '../database/database.module';
import { WalletService } from '@/wallet/wallet.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
