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
import { PosService } from './pos.service';
import {
  CreatePosTransactionDto,
  UpdatePosTransactionDto,
  GetPosTransactionsQueryDto,
  CreateDiscountDto,
  UpdateDiscountDto,
  GetDiscountsQueryDto,
  CreateReferralDto,
  GetReferralsQueryDto,
} from './pos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '@prisma/client';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  // POS Transaction Endpoints
  @Post('transactions')
  @Roles(UserType.gym_owner, UserType.staff)
  async createPosTransaction(
    @Body() createTransactionDto: CreatePosTransactionDto,
    @Request() req: any,
  ) {
    try {
      const { id: staffId } = req.user;
      const gymId = req.user.ownedGyms[0].id || req.user.staff.gymId
      return await this.posService.createPosTransaction(createTransactionDto, gymId, staffId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.log(error)
      throw new HttpException('Failed to create POS transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('transactions')
  @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  async findAllPosTransactions(@Query() query: GetPosTransactionsQueryDto, @Request() req: any) {
    try {
      const { gymId, userType } = req.user;
      const gymFilter = userType === UserType.super_admin ? undefined : gymId;
      return await this.posService.findAllPosTransactions(query, gymFilter);
    } catch (error) {
      throw new HttpException('Failed to fetch POS transactions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('transactions/:id')
  @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  async findOnePosTransaction(@Param('id') id: string, @Request() req: any) {
    try {
      const transaction = await this.posService.findOnePosTransaction(id);

      // Check gym access for non-super admin users
      if (req.user.userType !== UserType.super_admin && transaction.gymId !== req.user.gymId) {
        throw new HttpException('Access denied to this transaction', HttpStatus.FORBIDDEN);
      }

      return transaction;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch POS transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('transactions/:id')
  @Roles(UserType.gym_owner, UserType.staff)
  async updatePosTransaction(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdatePosTransactionDto,
    @Request() req: any,
  ) {
    try {
      const transaction = await this.posService.findOnePosTransaction(id);

      // Check gym access
      if (transaction.gymId !== req.user.gymId) {
        throw new HttpException('Access denied to this transaction', HttpStatus.FORBIDDEN);
      }

      return await this.posService.updatePosTransaction(id, updateTransactionDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update POS transaction', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Discount Management Endpoints
  @Post('discounts')
  @Roles(UserType.gym_owner)
  async createDiscount(@Body() createDiscountDto: CreateDiscountDto, @Request() req: any) {
    try {
      const { gymId } = req.user;
      return await this.posService.createDiscount(createDiscountDto, gymId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create discount', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('discounts')
  @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  async findAllDiscounts(@Query() query: GetDiscountsQueryDto, @Request() req: any) {
    try {
      const { gymId, userType } = req.user;
      const gymFilter = userType === UserType.super_admin ? undefined : gymId;
      return await this.posService.findAllDiscounts(query, gymFilter);
    } catch (error) {
      throw new HttpException('Failed to fetch discounts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('discounts/:id')
  @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  async findOneDiscount(@Param('id') id: string, @Request() req: any) {
    try {
      const discount = await this.posService.findOneDiscount(id);

      // Check gym access for non-super admin users
      if (req.user.userType !== UserType.super_admin && discount.gymId !== req.user.gymId) {
        throw new HttpException('Access denied to this discount', HttpStatus.FORBIDDEN);
      }

      return discount;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch discount', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('discounts/:id')
  @Roles(UserType.gym_owner)
  async updateDiscount(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
    @Request() req: any,
  ) {
    try {
      const discount = await this.posService.findOneDiscount(id);

      // Check gym access
      if (discount.gymId !== req.user.gymId) {
        throw new HttpException('Access denied to this discount', HttpStatus.FORBIDDEN);
      }

      return await this.posService.updateDiscount(id, updateDiscountDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update discount', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('discounts/:id')
  @Roles(UserType.gym_owner)
  async removeDiscount(@Param('id') id: string, @Request() req: any) {
    try {
      const discount = await this.posService.findOneDiscount(id);

      // Check gym access
      if (discount.gymId !== req.user.gymId) {
        throw new HttpException('Access denied to this discount', HttpStatus.FORBIDDEN);
      }

      return await this.posService.removeDiscount(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to delete discount', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Referral Management Endpoints
  // @Post('referrals')
  // @Roles(UserType.gym_owner, UserType.staff)
  // async createReferral(@Body() createReferralDto: CreateReferralDto, @Request() req: any) {
  //   try {
  //     const { gymId } = req.user;
  //     return await this.posService.createReferral(createReferralDto, gymId);
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     throw new HttpException('Failed to create referral', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // @Get('referrals')
  // @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  // async findAllReferrals(@Query() query: GetReferralsQueryDto, @Request() req: any) {
  //   try {
  //     const { gymId, userType } = req.user;
  //     const gymFilter = userType === UserType.super_admin ? undefined : gymId;
  //     return await this.posService.findAllReferrals(query, gymFilter);
  //   } catch (error) {
  //     throw new HttpException('Failed to fetch referrals', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // @Get('referrals/:id')
  // @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  // async findOneReferral(@Param('id') id: string, @Request() req: any) {
  //   try {
  //     const referral = await this.posService.findOneReferral(id);

  //     // Check gym access for non-super admin users
  //     if (req.user.userType !== UserType.super_admin && referral.gymId !== req.user.gymId) {
  //       throw new HttpException('Access denied to this referral', HttpStatus.FORBIDDEN);
  //     }

  //     return referral;
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     throw new HttpException('Failed to fetch referral', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // Statistics Endpoint
  @Get('stats')
  @Roles(UserType.gym_owner, UserType.staff, UserType.super_admin)
  async getPosStats(@Request() req: any) {
    try {
      const { gymId, userType } = req.user;
      const gymFilter = userType === UserType.super_admin ? undefined : gymId;
      return await this.posService.getPosStats(gymFilter);
    } catch (error) {
      throw new HttpException('Failed to fetch POS statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
