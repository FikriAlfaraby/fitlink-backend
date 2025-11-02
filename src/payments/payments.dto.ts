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
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentStatus, PaymentMethod, BillStatus } from '@prisma/client';

// Payment DTOs
export class CreatePaymentDto {
  @IsUUID()
  memberId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  billingId?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class GetPaymentsQueryDto {
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
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['paymentDate', 'amount', 'createdAt', 'updatedAt'])
  sortBy?: string = 'paymentDate';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// Billing DTOs
export class CreateBillingDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  membershipType?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsBoolean()
  autoPayEnabled?: boolean;
}

export class UpdateBillingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  membershipType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @IsOptional()
  @IsBoolean()
  autoPayEnabled?: boolean;
}

export class GetBillingsQueryDto {
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
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  membershipType?: string;

  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['dueDate', 'amount', 'createdAt', 'paidAt'])
  sortBy?: string = 'dueDate';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

// Response DTOs
export class PaymentStatsResponseDto {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  totalRevenue: number;
  totalBillings: number;
  pendingBillings: number;
  overdueBillings: number;
}
