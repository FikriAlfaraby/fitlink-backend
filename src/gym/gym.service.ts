import { PrismaService } from '@/database/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterGymDto } from './dto/register-gym.dto';
import * as QRCode from 'qrcode';
import { StorageService } from '@/storage/storage.service';
import * as fs from 'node:fs';
import { v4 as uuidv4, v4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

@Injectable()
export class GymService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private configService: ConfigService,
  ) {}

  async findGymByCode(code: string) {
    const gym = await this.prisma.gym.findUnique({
      where: {
        code,
      },
    });

    if (!gym) throw new NotFoundException(`Gym with code ${code} not found`);

    return gym;
  }

  async findGymById(id: string) {
    const gym = await this.prisma.gym.findUnique({
      where: {
        id,
      },
    });

    if (!gym) throw new NotFoundException(`Gym with id ${id} not found`);

    return gym;
  }

  async registerToGym(data: RegisterGymDto, userId: string) {
    const { gymId, pin } = data;

    const gym = await this.prisma.gym.findUnique({
      where: {
        id: gymId,
      },
    });

    if (!gym) {
      throw new NotFoundException('gym not found');
    }

    if (gym.status === 'inactive') {
      throw new BadRequestException('gym or not active');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.status != 'active') {
      throw new ConflictException("sorry, but you're not active user");
    }

    const userMember = await this.prisma.member.findMany({
      where: {
        userId,
        membershipStatus: 'active',
      },
    });

    if (userMember.length >= 5) {
      throw new ConflictException(
        `sorry, but you already become active member of ${userMember.length} gyms, this is max amount of become member`,
      );
    }

    userMember.forEach(v => {
      if (v.gymId === gymId) {
        throw new ConflictException('you already become member of this gym')
      }
    })

    const memberId = v4();

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      throw new UnauthorizedException('PIN is locked. Please try again later.');
    }
    let isValidCredential = await bcrypt.compare(pin, user.pinHash);

    if (!isValidCredential) {
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
      throw new BadRequestException('Pin incorrect, try again')
    }

    const qrCodeUrl = await this.createQRCode(memberId, userId);
    await this.prisma.member.create({
      data: {
        id: memberId,
        userId: userId,
        gymId,
        memberCode: `MEM${Date.now()}`,
        membershipType: 'basic',
        membershipStatus: 'active',
        joinDate: new Date(),
        qrCode: qrCodeUrl,
      },
    });

    return  {
      message: 'success',
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
}
