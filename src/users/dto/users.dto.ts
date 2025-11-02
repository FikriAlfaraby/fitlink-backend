import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserStatus, UserType } from '@prisma/client';

export class CreateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  pin?: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(UserType)
  userType: UserType;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: 'active' | 'inactive' | 'pending';
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: UserStatus;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePinDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  currentPin: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  newPin: string;
}

export class ResetPasswordDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class GetUsersQueryDto {
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: UserStatus;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
