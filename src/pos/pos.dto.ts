import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
  ArrayMinSize,
  isEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PosStatus, DiscountType, PaymentMethod } from '@prisma/client';

// POS Transaction Item DTO
export class PosTransactionItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;
  
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  productName?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number;
}

// Create POS Transaction DTO
export class CreatePosTransactionDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosTransactionItemDto)
  items: PosTransactionItemDto[];

  @IsOptional()
  @IsUUID()
  discountId?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod
}

// Update POS Transaction DTO
export class UpdatePosTransactionDto {
  @IsOptional()
  @IsEnum(PosStatus)
  status?: PosStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

// Get POS Transactions Query DTO
export class GetPosTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsEnum(PosStatus)
  status?: PosStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// Create Discount DTO
export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Update Discount DTO
export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Get Discounts Query DTO
export class GetDiscountsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// Create Referral DTO
export class CreateReferralDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsUUID()
  referrerId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// Get Referrals Query DTO
export class GetReferralsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  referrerId?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// POS Stats Response DTO
export class PosStatsResponseDto {
  totalTransactions: number;
  totalRevenue: number;
  totalDiscounts: number;
  totalReferrals: number;
  totalDiscountUsage: number;
  totalReferralUsage: number;
}
