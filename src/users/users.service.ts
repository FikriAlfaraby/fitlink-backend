import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserType, Prisma, UserStatus } from '@prisma/client';

export interface CreateUserDto {
  email?: string;
  phone?: string;
  password?: string;
  pin?: string;
  name: string;
  userType: UserType;
  gymId?: string;
  status?: UserStatus;
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  name?: string;
  status?: UserStatus;
}

export interface UpdateProfileDto {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePinDto {
  currentPin: string;
  newPin: string;
}

export interface ResetPasswordDto {
  phone: string;
  otp: string;
  newPassword: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: DatabaseService) {}

  async createUser(createUserDto: CreateUserDto) {
    const { email, phone, password, pin, name, userType, gymId, status = 'active' } = createUserDto;

    // Validate input based on user type
    if (userType === 'member' && phone && pin) {
      if (!phone || !pin || !name) {
        throw new BadRequestException('Phone, PIN, and name are required for mobile users');
      }
    } else {
      if (!email || !password || !name) {
        throw new BadRequestException('Email, password, and name are required');
      }
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [email ? { email } : {}, phone ? { phone } : {}].filter(
          obj => Object.keys(obj).length > 0,
        ),
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists with this email or phone');
    }

    // Hash password or PIN
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : undefined;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        phone,
        passwordHash: hashedPassword,
        pinHash: hashedPin,
        name,
        userType,
        status,
        phoneVerified: phone ? false : true,
        emailVerified: email ? false : true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        userType: true,
        status: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Create related records based on user type
    if (userType === 'member' && gymId) {
      await this.prisma.member.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          gymId,
          memberCode: `MEM${Date.now()}`,
          membershipType: 'basic',
          membershipStatus: 'active',
          joinDate: new Date(),
          qrCode: `QR_${uuidv4()}`,
        },
      });
    }

    return user;
  }

  async findAll(filters?: {
    userType?: UserType;
    status?: string;
    gymId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { userType, status, gymId, search, page = 1, limit = 10 } = filters || {};

    const skip = (page - 1) * limit;

    const whereConditions: any[] = [];

    if (userType) {
      whereConditions.push({ userType });
    }

    if (status) {
      whereConditions.push({ status });
    }

    if (search) {
      whereConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (gymId) {
      whereConditions.push({
        OR: [{ member: { gymId } }, { staff: { gymId } }, { ownedGyms: { some: { id: gymId } } }],
      });
    }

    const where: Prisma.UserWhereInput = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          userType: true,
          status: true,
          phoneVerified: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          member: {
            select: {
              id: true,
              memberCode: true,
              membershipType: true,
              membershipStatus: true,
              gym: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          staff: {
            select: {
              id: true,
              employeeId: true,
              role: true,
              department: true,
              gym: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          ownedGyms: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        userType: true,
        status: true,
        phoneVerified: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        member: {
          include: {
            gym: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
              },
            },
          },
        },
        staff: {
          include: {
            gym: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
              },
            },
          },
        },
        ownedGyms: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    // Check for email/phone conflicts
    if (updateUserDto.email || updateUserDto.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateUserDto.email ? { email: updateUserDto.email } : {},
                updateUserDto.phone ? { phone: updateUserDto.phone } : {},
              ].filter(obj => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('User already exists with this email or phone');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        // Reset verification status if email/phone changed
        emailVerified: updateUserDto.email ? false : undefined,
        phoneVerified: updateUserDto.phone ? false : undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        userType: true,
        status: true,
        phoneVerified: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.findOne(id);

    // Soft delete by updating status
    await this.prisma.user.update({
      where: { id },
      data: { status: 'inactive' },
    });

    return { message: 'User deleted successfully' };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.findOne(userId);

    // Check for email/phone conflicts
    if (updateProfileDto.email || updateProfileDto.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                updateProfileDto.email ? { email: updateProfileDto.email } : {},
                updateProfileDto.phone ? { phone: updateProfileDto.phone } : {},
              ].filter(obj => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('User already exists with this email or phone');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateProfileDto,
        // Reset verification status if email/phone changed
        emailVerified: updateProfileDto.email ? false : undefined,
        phoneVerified: updateProfileDto.phone ? false : undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        userType: true,
        phoneVerified: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('User does not have a password set');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async changePin(userId: string, changePinDto: ChangePinDto) {
    const { currentPin, newPin } = changePinDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pinHash: true },
    });

    if (!user || !user.pinHash) {
      throw new BadRequestException('User does not have a PIN set');
    }

    // Verify current PIN
    const isValidPin = await bcrypt.compare(currentPin, user.pinHash);
    if (!isValidPin) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    // Hash new PIN
    const hashedNewPin = await bcrypt.hash(newPin, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: hashedNewPin, lastPinChange: new Date() },
    });

    return { message: 'PIN changed successfully' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { phone, otp, newPassword } = resetPasswordDto;

    // Verify OTP
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose: 'password_reset',
        verified: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Find user by phone
    const user = await this.prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    // Mark OTP as used
    await this.prisma.otpVerification.delete({
      where: { id: otpRecord.id },
    });

    return { message: 'Password reset successfully' };
  }

  async getUserStats(gymId?: string) {
    const where = gymId
      ? {
          OR: [
            { member: { some: { gymId } } },
            { staff: { gymId } },
            { ownedGyms: { some: { id: gymId } } },
          ],
        }
      : {};

    const [total, active, inactive, byType] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, status: 'active' } }),
      this.prisma.user.count({ where: { ...where, status: 'inactive' } }),
      this.prisma.user.groupBy({
        by: ['userType'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byType: byType.reduce(
        (acc, item) => {
          acc[item.userType] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
