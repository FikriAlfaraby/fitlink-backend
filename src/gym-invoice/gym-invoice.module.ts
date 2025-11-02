import { Module } from '@nestjs/common';
import { GymInvoiceService } from './gym-invoice.service';
import { GymInvoiceController } from './gym-invoice.controller';
import { DatabaseModule } from '@/database/database.module';

@Module({
  controllers: [GymInvoiceController],
  providers: [GymInvoiceService],
  imports: [DatabaseModule]
})
export class GymInvoiceModule {}
