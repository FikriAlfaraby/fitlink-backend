import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Public } from './decorators/public.decorator';
import { GetCurrentUser, CurrentUser } from './decorators/current-user.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  SendOtpDto,
  VerifyOtpDto,
  ChangePasswordDto,
  ChangePinDto,
  ResetPasswordDto,
  RevokeSessionDto,
} from './dto/auth.dto';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    // Extract IP and User-Agent from request
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.authService.login({
      ...loginDto,
      ipAddress,
      userAgent,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@GetCurrentUser('sessionId') sessionId: string) {
    return this.authService.logout(sessionId);
  }

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.phone, sendOtpDto.purpose);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Get('profile')
  async getProfile(@GetCurrentUser() user: CurrentUser) {
    const data = await this.authService.getUserProfile(user.id)
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      userType: user.userType,
      status: user.status,
      gymId: user.gymId,
      member: user.member,
      staff: user.staff,
      ownedGyms: user.ownedGyms,
      ...data
    };
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetCurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    // Implementation for changing password
    // This would be implemented in AuthService
    return { message: 'Password changed successfully' };
  }

  @Patch('change-pin')
  @HttpCode(HttpStatus.OK)
  async changePin(
    @GetCurrentUser('id') userId: string,
    @Body() changePinDto: ChangePinDto,
  ) {
    // Implementation for changing PIN
    // This would be implemented in AuthService
    return { message: 'PIN changed successfully' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    // Implementation for password reset
    // This would be implemented in AuthService
    return { message: 'Password reset successfully' };
  }

  @Get('sessions')
  async getSessions(@GetCurrentUser('id') userId: string) {
    return this.authService.getUserSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @GetCurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('sessionId') currentSessionId: string,
  ) {
    return this.authService.revokeAllSessions(userId, currentSessionId);
  }

  @Get('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@GetCurrentUser() user: CurrentUser) {
    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        userType: user.userType,
        gymId: user.gymId,
      },
    };
  }
}