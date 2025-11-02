import { Controller, Get, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { GymInvoiceService } from './gym-invoice.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('gym-invoice')
export class GymInvoiceController {
  constructor(private readonly gymInvoiceService: GymInvoiceService) {
  }


  @ApiBearerAuth()
  @Get(':gymId/pdf')
    async getGymInvoicePdf(
      @Param('gymId') gymId: string,
      @Res() res: Response,
      @Query('month') month?: string,
      @Query('year') year?: string
    ) {
      try {
        const pdfBuffer = await this.gymInvoiceService.getGymInvoicePdf(gymId, month, year);
        
        // Set proper headers for PDF response
        const currentDate = new Date();
        const targetMonth = month || (currentDate.getMonth() + 1).toString();
        const targetYear = year || currentDate.getFullYear().toString();
        const filename = `gym-invoice-${gymId}-${targetYear}-${targetMonth}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        return res.status(HttpStatus.OK).send(pdfBuffer);
      } catch (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to generate PDF',
          error: 'Internal Server Error'
        });
      }
    }
}
