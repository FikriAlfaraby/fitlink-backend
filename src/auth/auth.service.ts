import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, PrismaClient, TransactionType, User, UserType, WalletType } from '@prisma/client';
import { JwtPayload } from './strategies/jwt.strategy';
import * as QRCode from 'qrcode';
import supabase from '@supabase/supabase-js';
import { StorageService } from '@/storage/storage.service';
import * as fs from 'node:fs';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { FonnteService } from '@/fonnte/fonnte.service';

export interface LoginResult {
  user: {
    id: string;
    email?: string;
    phone?: string;
    name: string;
    userType: UserType;
    gymId?: string | string[];
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface RegisterDto {
  email?: string;
  phone?: string;
  password?: string;
  pin?: string;
  name: string;
  userType: UserType;
  gymId?: string;
  gymName?: string;
  gymCode?: string;
}

export interface LoginDto {
  email?: string;
  phone?: string;
  password?: string;
  pin?: string;
  deviceInfo?: {
    deviceId: string;
    deviceName: string;
    platform: string;
    appVersion: string;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface OtpVerificationDto {
  phone: string;
  otp: string;
  purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification';
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private storageService: StorageService,
    private fonnteService: FonnteService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; requiresOtp?: boolean }> {
    const { email, phone, password, pin, name, userType, gymId, gymName, gymCode } = registerDto;

    // Validate input based on user type
    if (userType === 'member' && phone && pin) {
      // Mobile registration with phone + PIN
      if (!phone || !pin || !name) {
        throw new BadRequestException('Phone, PIN, and name are required for mobile registration');
      }
    } else {
      // Web registration with email + password
      if (!email || !password || !name) {
        throw new BadRequestException('Email, password, and name are required');
      }
    }

    // Check if user already exists (by email or phone)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [email ? { email } : {}, phone ? { phone } : {}].filter(
          obj => Object.keys(obj).length > 0,
        ),
      },
    });

    // Hash password or PIN (if provided)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : undefined;

    const result = await this.prisma.$transaction(async tx => {
      // Mobile registration flow: phone + pin (no email). OTP must be verified first.
      if (phone && !email) {
        // Validate OTP verification exists and is not expired
        const otpVerified = await this.prisma.otpVerification.findFirst({
          where: {
            phone,
            purpose: 'registration',
            verified: true,
          },
        });

        if (!otpVerified) {
          return {
            message: 'OTP not verified. Please verify OTP to complete registration.',
            requiresOtp: true,
          };
        }

        if (existingUser) {
          throw new ConflictException('User already exists with this email or phone');
        }

        // Create user now that OTP is verified
        const created = await tx.user.create({
          data: {
            id: uuidv4(),
            email: undefined,
            phone,
            passwordHash: undefined,
            pinHash: hashedPin,
            name,
            userType,
            status: 'active',
            phoneVerified: true,
            emailVerified: false,
          },
        });

        if (userType === 'member') {
          // TODO: harusnya ga begini, pokoknya nanti di gitu in
          // const gym = await this.prisma.gym.findFirst({
          //   orderBy: {
          //     createdAt: 'desc',
          //   },
          // });
          // const memberId = uuidv4()
          // const qrCodeUrl = await this.createQRCode(memberId, created.id);
          // await this.prisma.member.create({
          //   data: {
          //     id: memberId,
          //     userId: created.id,
          //     gymId: gymId ? gymId : gym.id,
          //     memberCode: `MEM${Date.now()}`,
          //     membershipType: 'basic',
          //     membershipStatus: 'active',
          //     joinDate: new Date(),
          //     qrCode: qrCodeUrl,
          //   },
          // });
        }
        // TODO : Gym Name
        if (userType === 'gym_owner' && !gymId) {
          await this.createGym(created.id, gymName, gymCode, tx);
        }

        return { message: 'Registration successful' };
      }

      // Create user for email registration (web flow)
      const user = await tx.user.create({
        data: {
          id: uuidv4(),
          email,
          phone,
          passwordHash: hashedPassword,
          pinHash: hashedPin,
          name,
          userType,
          status: 'active',
          phoneVerified: phone ? false : true,
          emailVerified: false, // Will be verified via email
        },
      });

      // TODO : Gym Name
      if (userType === 'gym_owner' && !gymId) {
        await this.createGym(user.id, gymName, gymCode, tx);
      }

      // Create member record if userType is member
      if (userType === 'member') {
        // TODO: harusnya ga begini, pokoknya nanti ini di gituin
        // const gym = await this.prisma.gym.findFirst({
        //   orderBy: {
        //     createdAt: 'desc',
        //   },
        // });
        // const memberId = uuidv4()
        // const qrCodeUrl = await this.createQRCode(memberId, user.id);
        // await this.prisma.member.create({
        //   data: {
        //     id: memberId,
        //     userId: user.id,
        //     gymId: gymId ? gymId : gym.id,
        //     memberCode: `MEM${Date.now()}`,
        //     membershipType: 'basic',
        //     membershipStatus: 'active',
        //     joinDate: new Date(),
        //     qrCode: qrCodeUrl,
        //   },
        // });
      }
      return { message: 'Registration successful' };
    });

    return result;
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const { email, phone, password, pin, deviceInfo, ipAddress, userAgent } = loginDto;

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [email ? { email } : {}, phone ? { phone } : {}].filter(
          obj => Object.keys(obj).length > 0,
        ),
        status: 'active',
      },
      include: {
        member: {
          include: { gym: true },
        },
        staff: {
          include: { gym: true },
        },
        ownedGyms: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password or PIN
    let isValidCredential = false;
    if (password && user.passwordHash) {
      isValidCredential = await bcrypt.compare(password, user.passwordHash);
      console.log('hasil');
      console.log(isValidCredential);
    } else if (pin && user.pinHash) {
      // Check PIN attempts and lock status
      if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
        throw new UnauthorizedException('PIN is locked. Please try again later.');
      }

      isValidCredential = await bcrypt.compare(pin, user.pinHash);

      if (!isValidCredential && user.member) {
        // Increment PIN attempts
        const attempts = (user.pinAttempts || 0) + 1;
        const maxAttempts = parseInt(this.configService.get('PIN_MAX_ATTEMPTS', '3'));
        const lockDuration = parseInt(this.configService.get('PIN_LOCK_DURATION', '900000')); // 15 minutes

        const updateData: Partial<User> = { pinAttempts: attempts };
        if (attempts >= maxAttempts) {
          updateData.pinLockedUntil = new Date(Date.now() + lockDuration);
        }

        await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    console.log(isValidCredential);

    if (!isValidCredential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset PIN attempts on successful login
    if (pin && user.member) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          pinAttempts: 0,
          pinLockedUntil: null,
        },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create session
    const sessionId = uuidv4();
    const sessionExpiresIn = parseInt(this.configService.get('SESSION_EXPIRES_IN', '86400000')); // 24 hours
    const refreshExpiresIn = parseInt(
      this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '604800000'),
    ); // 7 days

    const session = await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        sessionToken: uuidv4(),
        refreshToken: uuidv4(),
        deviceInfo: deviceInfo
          ? {
              deviceId: deviceInfo.deviceId,
              deviceName: deviceInfo.deviceName,
              platform: deviceInfo.platform,
              appVersion: deviceInfo.appVersion,
            }
          : null,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + sessionExpiresIn),
        refreshExpiresAt: new Date(Date.now() + refreshExpiresIn),
        isActive: true,
        lastActivity: new Date(),
      },
    });

    // Generate JWT tokens
    const gymId = user.member?.map(v => v.gymId) || [user.staff?.gymId] || [
        user.ownedGyms?.[0]?.id,
      ];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      gymId,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionId, type: 'refresh' },
      {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        userType: user.userType,
        gymId,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify session
      const session = await this.prisma.userSession.findUnique({
        where: { id: payload.sessionId },
        include: {
          user: {
            include: {
              member: { include: { gym: true } },
              staff: { include: { gym: true } },
              ownedGyms: true,
            },
          },
        },
      });

      if (!session || !session.isActive || session.refreshExpiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const user = session.user;
      const gymId = user.member?.map(v => v.gymId) || [user.staff?.gymId] || [
          user.ownedGyms?.[0]?.id,
        ];

      // Generate new tokens
      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        gymId,
        sessionId: session.id,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
      });

      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, sessionId: session.id, type: 'refresh' },
        {
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      );

      // Update session activity
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(sessionId: string): Promise<{ message: string }> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return { message: 'Logged out successfully' };
  }

  async sendOtp(
    phone: string,
    purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification',
  ): Promise<{ message: string }> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIn = parseInt(this.configService.get('OTP_EXPIRES_IN', '300000')); // 5 minutes

    // Delete existing OTP for this phone and purpose
    await this.prisma.otpVerification.deleteMany({
      where: { phone, purpose },
    });

    // Create new OTP record
    await this.prisma.otpVerification.create({
      data: {
        id: uuidv4(),
        phone,
        otpCode: otp,
        purpose,
        expiresAt: new Date(Date.now() + expiresIn),
        attempts: 0,
        verified: false,
      },
    });

    this.fonnteService.sendOtp(phone, purpose, otp);

    // TODO: Integrate with SMS service (Twilio, etc.)
    console.log(`OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(otpDto: OtpVerificationDto): Promise<{ message: string; verified: boolean }> {
    const { phone, otp, purpose } = otpDto;

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        verified: false,
        // Use a small tolerance to avoid boundary race with DB/server time
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const maxAttempts = parseInt(this.configService.get('OTP_MAX_ATTEMPTS', '3'));
    if (otpRecord.attempts >= maxAttempts) {
      throw new BadRequestException('Maximum OTP attempts exceeded');
    }

    if (otpRecord.otpCode !== otp) {
      // Increment attempts
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      throw new BadRequestException('Invalid OTP');
    }

    // Mark OTP as verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Update user phone verification status if purpose is registration or phone_verification
    if (purpose === 'registration' || purpose === 'phone_verification') {
      await this.prisma.user.updateMany({
        where: { phone },
        data: {
          phoneVerified: true,
          status: purpose === 'registration' ? 'active' : undefined,
        },
      });
    }

    return { message: 'OTP verified successfully', verified: true };
  }

  async getUserProfile(userId: string) {
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        avatar: true,
        emergencyContact: true,
        userType: true,

        member: {
          include: {
            gym: true,
          },
        },
        name: true,
        profileImage: true,
      },
    });
  }

  async getUserSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        lastActivity: true,
        createdAt: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<{ message: string }> {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<{ message: string }> {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        id: exceptSessionId ? { not: exceptSessionId } : undefined,
      },
      data: { isActive: false },
    });

    return { message: 'All sessions revoked successfully' };
  }

  private async createGym(
    userId: string,
    gymName: string,
    gymCode?: string,
    transaction?: Omit<
      PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ) {
    // TODO : need to add gym name in FE and send it to BE
    const tx = transaction ?? this.prisma;
    const gym = await tx.gym.findFirst({
      where: {
        ownerId: userId,
      },
    });

    if (!gym) {
      if (gymCode) {
        const gymCodeRegistered = await tx.gym.findFirst({
          where: {
            code: gymCode,
          },
        });
        if (gymCodeRegistered) {
          throw new BadRequestException('Gym code already registered');
        }
      } else {
        // Generate a unique 4-character code. Try in small batches for efficiency.
        let foundUniqueCode = false;
        while (!foundUniqueCode) {
          const candidateCodes = [
            this.generateRandomString(4),
            this.generateRandomString(4),
            this.generateRandomString(4),
            this.generateRandomString(4),
          ];

          const existing = await tx.gym.findMany({
            where: {
              code: {
                in: candidateCodes,
              },
            },
            select: { code: true },
          });

          const existingSet = new Set(existing.map(v => v.code));
          const available = candidateCodes.find(c => !existingSet.has(c));
          if (available) {
            gymCode = available;
            foundUniqueCode = true;
          }
        }
      }
      const gym = await tx.gym.create({
          data: {
            name: gymName,
            ownerId: userId,
            code: gymCode,
          },
        })
      await tx.wallet.createMany({
          data: [
            {
            gymId: gym.id,
            walletType: WalletType.cash,
            currentBalance: 0,
            initialBalance: 0,
            totalIncome: 0,
            totalWithdrawals: 0,
            totalFees: 0,
            todayIncome: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            canWithdraw: false
          },
          {
            gymId: gym.id,
            walletType: WalletType.qris,
            currentBalance: 0,
            initialBalance: 0,
            totalIncome: 0,
            totalWithdrawals: 0,
            totalFees: 0,
            todayIncome: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            canWithdraw: true
          },
          {
            gymId: gym.id,
            walletType: WalletType.bank_transfer,
            currentBalance: 0,
            initialBalance: 0,
            totalIncome: 0,
            totalWithdrawals: 0,
            totalFees: 0,
            todayIncome: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            canWithdraw: true
          }
        ],
      })
    }
  }

  private async createQRCode(payload: string, userId: string) {
    // Create QR code data in the format expected by the scanner
    // Format: FITLINK_MEMBER_M001 (where M001 is the member ID)

    // Method 1: Using toFileStream with temporary file
    const tempFilePath = `./storage/temp_qr_${Date.now()}.png`;

    try {
      // Use toFile to generate QR code to a temporary file
      await QRCode.toFile(tempFilePath, payload, { version: 4, type: 'png' });

      // Read the file content
      // const fs = await import('fs');
      const fileBuffer = await fs.promises.readFile(tempFilePath);

      // Create a mock file object for the storage service
      const qrcodeFile: Express.Multer.File = {
        fieldname: 'qrcode',
        originalname: `member_${payload}.png`,
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: fileBuffer,
        size: fileBuffer.length,
        destination: '',
        filename: `member_${payload}.png`,
        path: tempFilePath,
        stream: null,
      };

      const uploadResult = await this.storageService.uploadFile('qrcode', qrcodeFile, userId);

      // Clean up temporary file
      // await fs.promises.unlink(tempFilePath);

      return uploadResult.url;
    } catch (error) {
      // Clean up temporary file in case of error
      try {
        const fs = await import('fs');
        await fs.promises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError);
      }
      throw error;
    }
  }

  // Alternative method using toFileStream with streams
  private async createQRCodeWithStream(payload: string, userId: string) {
    const qrCodeData = `FITLINK_MEMBER_M${payload}`;

    return new Promise<string>((resolve, reject) => {
      const fs = require('fs');
      const path = require('path');
      const tempFilePath = path.join('./', `temp_qr_${Date.now()}.png`);

      // Create a write stream
      const writeStream = fs.createWriteStream(tempFilePath);

      // Generate QR code to stream
      QRCode.toFileStream(writeStream, qrCodeData, { type: 'png' })
        .then(async () => {
          try {
            // Read the generated file
            const fileBuffer = await fs.promises.readFile(tempFilePath);

            // Create mock file object
            const qrcodeFile: Express.Multer.File = {
              fieldname: 'qrcode',
              originalname: `member_${payload}.png`,
              encoding: '7bit',
              mimetype: 'image/png',
              buffer: fileBuffer,
              size: fileBuffer.length,
              destination: '',
              filename: `member_${payload}.png`,
              path: tempFilePath,
              stream: null,
            };

            // Upload to storage
            const uploadResult = await this.storageService.uploadFile('qrcode', qrcodeFile, userId);

            // Clean up
            await fs.promises.unlink(tempFilePath);

            resolve(uploadResult.url);
          } catch (error) {
            // Clean up on error
            try {
              await fs.promises.unlink(tempFilePath);
            } catch (cleanupError) {
              console.error('Failed to cleanup temp file:', cleanupError);
            }
            reject(error);
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  private generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
