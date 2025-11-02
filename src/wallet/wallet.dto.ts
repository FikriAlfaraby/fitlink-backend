import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsInt,
  IsDecimal,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionType, WalletType, ReferenceType } from '@prisma/client';

// Wallet Transaction DTOs
export class CreateWalletTransactionDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

export class TopUpWalletDto {
  @IsEnum(WalletType)
  walletType: WalletType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

export class WithdrawWalletDto {
  @IsEnum(WalletType)
  walletType: WalletType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

export class AdjustWalletDto {
  @IsEnum(WalletType)
  walletType: WalletType;

  @IsNumber()
  amount: number; // Can be positive or negative

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

export class GetWalletTransactionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['processedAt', 'amount', 'transactionType'])
  sortBy?: string = 'processedAt';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// Response DTOs
export class WalletResponseDto {
  id: string;
  gymId: string;
  walletType: WalletType;
  currentBalance: number;
  initialBalance: number;
  totalIncome: number;
  totalWithdrawals: number;
  totalFees: number;
  todayIncome: number;
  isActive: boolean;
  canWithdraw: boolean;
  minWithdrawal: number;
  createdAt: Date;
  updatedAt: Date;
  gym?: {
    id: string;
    name: string;
  };
}

export class WalletTransactionResponseDto {
  id: string;
  walletId: string;
  transactionType: TransactionType;
  amount: number;
  feeAmount: number;
  netAmount: number;
  description?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
  processedAt: Date;
  wallet?: WalletResponseDto;
}

export class WalletStatsResponseDto {
  totalTransactions: number;
  totalIncome: number;
  totalWithdrawals: number;
  totalFees: number;
  totalVolume: number;
  totalWalletBalance: number;
}

export class WalletTransactionsWithMetaDto {
  data: WalletTransactionResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class WalletWithTransactionsDto {
  wallet: WalletResponseDto;
  transactions: WalletTransactionsWithMetaDto;
}