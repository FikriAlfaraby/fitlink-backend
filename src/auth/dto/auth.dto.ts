import { IsEmail, IsString, IsOptional, MinLength, MaxLength, IsEnum, IsObject, ValidateNested, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '@prisma/client';

export class DeviceInfoDto {
  @IsString()
  deviceId: string;

  @IsString()
  deviceName: string;

  @IsString()
  platform: string;

  @IsString()
  appVersion: string;
}

export class RegisterDto {
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
  @IsString()
  gymName?: string;

  @IsOptional()
  @IsString()
  gymCode?: string;
}

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class SendOtpDto {
  @IsString()
  phone: string;

  @IsEnum(['registration', 'login', 'password_reset', 'phone_verification'])
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification';
}

export class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;

  @IsEnum(['registration', 'login', 'password_reset', 'phone_verification'])
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification';
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

export class RevokeSessionDto {
  @IsString()
  sessionId: string;
}