import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  GetPaymentsQueryDto,
  CreateBillingDto,
  UpdateBillingDto,
  GetBillingsQueryDto,
  PaymentStatsResponseDto,
} from './payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Payment Management
  @Post()
  @Roles(UserType.gym_owner, UserType.staff)
  async createPayment(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    try {
      const gymId = req.user.gymId;
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.paymentsService.createPayment(createPaymentDto, gymId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Get()
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  async findAllPayments(@Query() query: GetPaymentsQueryDto, @Request() req) {
    let gymId: string | undefined;

    if (req.user.userType === UserType.member) {
      // Members can only see their own payments
      query.memberId = req.user.id;
      gymId = req.user.gymId;
    } else if (req.user.userType !== UserType.super_admin) {
      gymId = req.user.gymId;
    }

    return await this.paymentsService.findAllPayments(query, gymId);
  }

  @Get('stats')
  @Roles(UserType.gym_owner, UserType.staff)
  async getPaymentStats(@Request() req): Promise<PaymentStatsResponseDto> {
    const gymId = req.user.userType === UserType.super_admin ? undefined : req.user.gymId;
    return await this.paymentsService.getPaymentStats(gymId);
  }

  @Get(':id')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  async findOnePayment(@Param('id') id: string, @Request() req) {
    const payment = await this.paymentsService.findOnePayment(id);

    // Check access permissions
    if (req.user.userType === UserType.member && payment.memberId !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    if (
      req.user.userType !== UserType.super_admin &&
      req.user.userType !== UserType.member &&
      payment.gymId !== req.user.gymId
    ) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return payment;
  }

  @Patch(':id')
  @Roles(UserType.gym_owner, UserType.staff)
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req,
  ) {
    const payment = await this.paymentsService.findOnePayment(id);

    // Check gym ownership
    if (req.user.userType !== UserType.super_admin && payment.gymId !== req.user.gymId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return await this.paymentsService.updatePayment(id, updatePaymentDto);
  }

  @Delete(':id')
  @Roles(UserType.gym_owner)
  async removePayment(@Param('id') id: string, @Request() req) {
    const payment = await this.paymentsService.findOnePayment(id);

    // Check gym ownership
    if (req.user.userType !== UserType.super_admin && payment.gymId !== req.user.gymId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.paymentsService.removePayment(id);
    } catch (error) {
      if (error.message.includes('completed payment')) {
        throw new HttpException('Cannot delete completed payment', HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  // Billing Management
  @Post('billings')
  @Roles(UserType.gym_owner, UserType.staff)
  async createBilling(@Body() createBillingDto: CreateBillingDto, @Request() req) {
    try {
      const gymId = req.user.gymId;
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.paymentsService.createBilling(createBillingDto, gymId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Get('billings')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  async findAllBillings(@Query() query: GetBillingsQueryDto, @Request() req) {
    let gymId: string | undefined;

    if (req.user.userType === UserType.member) {
      // Members can only see their own billings
      query.memberId = req.user.id;
      gymId = req.user.gymId;
    } else if (req.user.userType !== UserType.super_admin) {
      gymId = req.user.gymId;
    }

    return await this.paymentsService.findAllBillings(query, gymId);
  }

  @Get('billings/:id')
  @Roles(UserType.gym_owner, UserType.staff, UserType.member)
  async findOneBilling(@Param('id') id: string, @Request() req) {
    const billing = await this.paymentsService.findOneBilling(id);

    // Check access permissions
    if (req.user.userType === UserType.member && billing.memberId !== req.user.id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    if (
      req.user.userType !== UserType.super_admin &&
      req.user.userType !== UserType.member &&
      billing.gymId !== req.user.gymId
    ) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return billing;
  }

  @Patch('billings/:id')
  @Roles(UserType.gym_owner, UserType.staff)
  async updateBilling(
    @Param('id') id: string,
    @Body() updateBillingDto: UpdateBillingDto,
    @Request() req,
  ) {
    const billing = await this.paymentsService.findOneBilling(id);

    // Check gym ownership
    if (req.user.userType !== UserType.super_admin && billing.gymId !== req.user.gymId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return await this.paymentsService.updateBilling(id, updateBillingDto);
  }

  @Delete('billings/:id')
  @Roles(UserType.gym_owner)
  async removeBilling(@Param('id') id: string, @Request() req) {
    const billing = await this.paymentsService.findOneBilling(id);

    // Check gym ownership
    if (req.user.userType !== UserType.super_admin && billing.gymId !== req.user.gymId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    try {
      return await this.paymentsService.removeBilling(id);
    } catch (error) {
      if (error.message.includes('associated payments')) {
        throw new HttpException(
          'Cannot delete billing record with associated payments',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }
}
