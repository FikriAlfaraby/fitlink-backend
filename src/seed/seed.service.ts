import { PrismaService } from '@/database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seed(file: Express.Multer.File, gymId: string) {
    // Seed data logic here
    console.log(file);

    // const gyms = await this.prisma.gym.findMany()
    // console.log(gyms)

    const gym = await this.prisma.gym.findUnique({
      where: {
        id: gymId,
      },
    });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    const workbook = xlsx.read(file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<{ name: string; phone: number }>(worksheet);
    console.log(data);
    const fieldName = ['name', 'phone'];
    // Process data and seed into database
    const dataToInsert = [];

    const pinDefaultHash = await bcrypt.hash('000000', 10);

    const result = await this.prisma.$transaction(async tx => {
      for (const item of data) {
        await tx.user.create({
          data: {
            name: item.name,
            phone: `0${item.phone}`,
            pinHash: pinDefaultHash,
            userType: 'member',
            member: {
              create: {
                gymId,
                memberCode: `MEM${Date.now()}`,
                membershipType: 'basic',
                membershipStatus: 'active',
              },
            },
          },
        });
      }
    });

    return true;
  }
}
