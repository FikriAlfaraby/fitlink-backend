import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MembershipStatus, CheckinStatus } from '@prisma/client';

export class CreateMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  pin?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;



  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid emergency phone number format' })
  emergencyPhone?: string;

  @IsString()
  @IsNotEmpty()
  membershipType: string;

  @IsDateString()
  membershipStartDate: string;

  @IsDateString()
  membershipEndDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;



  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid emergency phone number format' })
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  membershipType?: string;

  @IsOptional()
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @IsOptional()
  @IsDateString()
  membershipStartDate?: string;

  @IsOptional()
  @IsDateString()
  membershipEndDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetMembersQueryDto {
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
  @IsEnum(MembershipStatus)
  membershipStatus?: MembershipStatus;

  @IsOptional()
  @IsString()
  membershipType?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['name', 'email', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CheckInOutDto {
  @IsUUID()
  memberId: string;

  @IsEnum(CheckinStatus)
  @IsOptional()
  type?: CheckinStatus;

  @IsString()
  @IsOptional()
  gymId?: string;
}

export class GenerateQrCodeDto {
  @IsUUID()
  memberId: string;
}

export class MemberStatsResponseDto {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  expiredMembers: number;
}

export class QrCodeResponseDto {
  memberId: string;
  memberName: string;
  qrCodeData: {
    memberId: string;
    gymId: string;
    name: string;
    membershipType: string;
    timestamp: string;
  };
  qrCodeImage: string;
  generatedAt: Date;
}

export class CheckInOutHistoryQueryDto {
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
  limit?: number = 20;
}
