import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import {
  CreateWalletTransactionDto,
  GetWalletTransactionsQueryDto,
  TopUpWalletDto,
  WithdrawWalletDto,
  AdjustWalletDto,
  WalletStatsResponseDto,
} from './wallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType, WalletType } from '@prisma/client';

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Get all wallets for a gym
  @Get()
  @Roles(UserType.gym_owner, UserType.staff)
  async getWalletsByGym(@Request() req) {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.walletService.getWalletsByGym(gymId);
  }

  // Get specific wallet by type
  @Get(':walletType')
  @Roles(UserType.gym_owner, UserType.staff)
  async getWalletByType(@Param('walletType') walletType: WalletType, @Request() req) {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.walletService.getWalletByType(gymId, walletType);
  }

  // Get wallet with transactions
  @Get(':walletType/transactions')
  @Roles(UserType.gym_owner, UserType.staff)
  async getWalletWithTransactions(
    @Param('walletType') walletType: WalletType,
    @Query() query: GetWalletTransactionsQueryDto,
    @Request() req,
  ) {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.walletService.getWalletWithTransactions(gymId, walletType, query);
  }

  // Wallet Operations
  @Post('top-up')
  @Roles(UserType.gym_owner, UserType.staff)
  async topUpWallet(@Body() topUpDto: TopUpWalletDto, @Request() req) {
    try {
      let gymId: string
      if (req.user.userType === UserType.gym_owner) {
        gymId = req.user.ownedGyms[0].id
      } else {
        gymId = req.user.staff.gymId
      }
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.walletService.topUpWallet(gymId, topUpDto);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('greater than 0')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Post('withdraw')
  @Roles(UserType.gym_owner, UserType.staff)
  async withdrawFromWallet(@Body() withdrawDto: WithdrawWalletDto, @Request() req) {
    try {
      let gymId: string
      if (req.user.userType === UserType.gym_owner) {
        gymId = req.user.ownedGyms[0].id
      } else {
        gymId = req.user.staff.gymId
      }
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.walletService.withdrawFromWallet(
        gymId,
        withdrawDto.walletType,
        withdrawDto.amount,
        withdrawDto.description,
        withdrawDto.referenceType,
        withdrawDto.referenceId,
      );
    } catch (error) {
      if (error.message.includes('Insufficient')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.message.includes('greater than 0')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Post('adjust')
  @Roles(UserType.gym_owner, UserType.staff)
  async adjustWallet(@Body() adjustDto: AdjustWalletDto, @Request() req) {
    try {
      let gymId: string
      if (req.user.userType === UserType.gym_owner) {
        gymId = req.user.ownedGyms[0].id
      } else {
        gymId = req.user.staff.gymId
      }
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      return await this.walletService.adjustWallet(
        gymId,
        adjustDto.walletType,
        adjustDto.amount,
        adjustDto.description,
        adjustDto.referenceType,
        adjustDto.referenceId,
      );
    } catch (error) {
      if (error.message.includes('Insufficient')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  // Transaction Management
  @Post('transactions')
  @Roles(UserType.gym_owner, UserType.staff)
  async createTransaction(
    @Body() createTransactionDto: CreateWalletTransactionDto,
    @Query('walletType') walletType: WalletType,
    @Request() req,
  ) {
    try {
      let gymId: string
      if (req.user.userType === UserType.gym_owner) {
        gymId = req.user.ownedGyms[0].id
      } else {
        gymId = req.user.staff.gymId
      }
      if (!gymId) {
        throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
      }
      if (!walletType) {
        throw new HttpException('Wallet type is required', HttpStatus.BAD_REQUEST);
      }
      return await this.walletService.createWalletTransaction(
        gymId,
        walletType,
        createTransactionDto,
      );
    } catch (error) {
      if (error.message.includes('Insufficient')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      if (error.message.includes('greater than 0')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Get('transactions/all')
  @Roles(UserType.gym_owner, UserType.staff)
  async findAllTransactions(@Query() query: GetWalletTransactionsQueryDto, @Request() req) {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.walletService.findAllTransactions(gymId, query);
  }

  @Get('transactions/:id')
  @Roles(UserType.gym_owner, UserType.staff)
  async findOneTransaction(@Param('id') id: string, @Request() req) {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }

    const transaction = await this.walletService.findOneTransaction(id, gymId);
    return transaction;
  }

  // Statistics
  @Get('stats')
  @Roles(UserType.gym_owner, UserType.staff)
  async getWalletStats(@Request() req): Promise<WalletStatsResponseDto> {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.walletService.getWalletStats(gymId);
  }

  // Reset today income (for cron job or manual reset)
  @Post('reset-today-income')
  @Roles(UserType.gym_owner)
  async resetTodayIncome(@Request() req) {
    let gymId: string
    if (req.user.userType === UserType.gym_owner) {
      gymId = req.user.ownedGyms[0].id
    } else {
      gymId = req.user.staff.gymId
    }
    if (!gymId) {
      throw new HttpException('Gym ID is required', HttpStatus.BAD_REQUEST);
    }
    await this.walletService.resetTodayIncome(gymId);
    return { message: 'Today income reset successfully' };
  }
}
