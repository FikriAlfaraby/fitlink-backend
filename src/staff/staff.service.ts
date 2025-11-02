import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  GetStaffQueryDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  GetSchedulesQueryDto,
} from './staff.dto';

import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StaffService {
  constructor(
    private prisma: DatabaseService,
    private configService: ConfigService,
  ) {}

  async createStaff(createStaffDto: CreateStaffDto, gymId: string) {
    const {
      email,
      phone,
      password,
      pin,
      name,
      role,
      emergencyContact,
      hireDate,
      salary,
    } = createStaffDto;

    // Check if email or phone already exists
    if (email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingUser) {
        throw new BadRequestException('Phone number already exists');
      }
    }

    // Hash password or PIN
    let hashedPassword: string | undefined;
    let hashedPin: string | undefined;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }
    if (pin) {
      hashedPin = await bcrypt.hash(pin, 12);
    }

    return this.prisma.$transaction(async tx => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash: hashedPassword,
          pinHash: hashedPin,
          name,
          userType: 'staff',
        },
      });

      // Create staff profile
      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          gymId,
          role,
          emergencyContact,
          hireDate: new Date(hireDate),
          salary,
        },
      });

      return {
        ...user,
        staff,
      };
    });
  }

  async findAllStaff(query: GetStaffQueryDto, gymId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      userType: 'staff',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.status = isActive ? 'active' : 'inactive';
    }

    const staffWhere: any = {
      gymId
    };
    if (role) {
      staffWhere.role = role;
    }

    if (Object.keys(staffWhere).length > 0) {
      where.staff = staffWhere;
    }

    const [staff, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          staff: true,
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: staff,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findStaffById(id: string, gymId: string) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id,
        userType: 'staff',
        staff: {
          gymId,
        },
      },
      include: {
        staff: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  async updateStaff(id: string, updateStaffDto: UpdateStaffDto, gymId: string) {
    const staff = await this.findStaffById(id, gymId);

    const {
      email,
      phone,
      name,
      role,
      emergencyContact,
      hireDate,
      salary,
      isActive,
    } = updateStaffDto;

    // Check for email/phone conflicts
    if (email && email !== staff.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (phone && phone !== staff.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Phone number already exists');
      }
    }

    return this.prisma.$transaction(async tx => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          email,
          phone,
          name,
          status: isActive !== undefined ? (isActive ? 'active' : 'inactive') : undefined,
        },
      });

      // Update staff profile
      const updatedStaff = await tx.staff.update({
        where: { userId: id },
        data: {
          role,
          emergencyContact,
          hireDate: hireDate ? new Date(hireDate) : undefined,
          salary,
        },
      });

      return {
        ...updatedUser,
        staff: updatedStaff,
      };
    });
  }

  async deleteStaff(id: string, gymId: string) {
    const staff = await this.findStaffById(id, gymId);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'inactive',
      },
    });
  }

  async createSchedule(createScheduleDto: CreateScheduleDto, gymId: string) {
    const { staffId, title, description, startTime, endTime, isRecurring, recurringDays } =
      createScheduleDto;

    // Verify staff exists and belongs to gym
    await this.findStaffById(staffId, gymId);

    // Check for schedule conflicts
    const conflictingSchedule = await this.prisma.staffSchedule.findFirst({
      where: {
        staffId,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gte: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lte: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingSchedule) {
      throw new BadRequestException('Schedule conflicts with existing schedule');
    }

    return this.prisma.staffSchedule.create({
      data: {
        staffId,
        startTime,
        endTime,
      },
      include: {
        staff: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findAllSchedules(query: GetSchedulesQueryDto, gymId: string) {
    const {
      page = 1,
      limit = 10,
      staffId,
      startDate,
      endDate,
      sortBy = 'startTime',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      staff: {
        gymId,
      },
    };

    if (staffId) {
      where.staffId = staffId;
    }

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ startTime: { gte: startDate } });
      }
      if (endDate) {
        where.AND.push({ endTime: { lte: endDate } });
      }
    }

    const [schedules, total] = await Promise.all([
      this.prisma.staffSchedule.findMany({
        where,
        include: {
          staff: {
            include: {
              user: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.staffSchedule.count({ where }),
    ]);

    return {
      data: schedules,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findScheduleById(id: string, gymId: string) {
    const schedule = await this.prisma.staffSchedule.findFirst({
      where: {
        id,
        staff: {
          gymId,
        },
      },
      include: {
        staff: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async updateSchedule(id: string, updateScheduleDto: UpdateScheduleDto, gymId: string) {
    const schedule = await this.findScheduleById(id, gymId);

    const { startTime, endTime } = updateScheduleDto;

    // Check for schedule conflicts (excluding current schedule)
    if (startTime || endTime) {
      const newStartTime = startTime || schedule.startTime;
      const newEndTime = endTime || schedule.endTime;

      const conflictingSchedule = await this.prisma.staffSchedule.findFirst({
        where: {
          staffId: schedule.staffId,
          id: { not: id },
          OR: [
            {
              AND: [{ startTime: { lte: newStartTime } }, { endTime: { gte: newStartTime } }],
            },
            {
              AND: [{ startTime: { lte: newEndTime } }, { endTime: { gte: newEndTime } }],
            },
            {
              AND: [{ startTime: { gte: newStartTime } }, { endTime: { lte: newEndTime } }],
            },
          ],
        },
      });

      if (conflictingSchedule) {
        throw new BadRequestException('Schedule conflicts with existing schedule');
      }
    }

    return this.prisma.staffSchedule.update({
      where: { id },
      data: {
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      },
      include: {
        staff: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async deleteSchedule(id: string, gymId: string) {
    const schedule = await this.findScheduleById(id, gymId);

    return this.prisma.staffSchedule.delete({
      where: { id },
    });
  }

  async getStaffStats(gymId: string) {
    const [totalStaff, activeStaff, inactiveStaff, staffByRole] = await Promise.all([
      this.prisma.user.count({
        where: {
          userType: 'staff',
          staff: {
            gymId,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userType: 'staff',
          status: 'active',
          staff: {
            gymId,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userType: 'staff',
          status: 'inactive',
          staff: {
            gymId,
          },
        },
      }),
      this.prisma.staff.groupBy({
        by: ['role'],
        where: {
          gymId,
        },
        _count: {
          role: true,
        },
      }),
    ]);

    const roleStats = staffByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalStaff,
      activeStaff,
      inactiveStaff,
      staffByRole: roleStats,
    };
  }

  async getStaffPerformance(staffId: string, gymId: string, startDate?: string, endDate?: string) {
    await this.findStaffById(staffId, gymId);

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    const where: any = {
      staffId,
    };

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [schedulesCount, completedSchedules] = await Promise.all([
      this.prisma.staffSchedule.count({
        where: {
          staffId,
          ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter }),
        },
      }),
      this.prisma.staffSchedule.count({
        where: {
          staffId,
          endTime: { lt: new Date() },
          ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter }),
        },
      }),
    ]);

    const attendanceRate = schedulesCount > 0 ? (completedSchedules / schedulesCount) * 100 : 0;

    return {
      staffId,
      totalSchedules: schedulesCount,
      completedSchedules,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }
}
