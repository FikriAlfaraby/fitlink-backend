import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  GetMembersQueryDto,
  CheckInOutDto,
  GenerateQrCodeDto,
} from './members.dto';
import { MembershipStatus, CheckinStatus, ProductCategory, $Enums } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MembersService {
  constructor(
    private prisma: DatabaseService,
    private configService: ConfigService,
  ) {}

  async createMember(createMemberDto: CreateMemberDto, gymId: string) {
    const {
      email,
      phone,
      password,
      pin,
      name,
      emergencyContact,
      emergencyPhone,
      membershipType,
      membershipStartDate,
      membershipEndDate,
    } = createMemberDto;

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
          userType: 'member',
          status: 'active',
          emergencyContact: emergencyContact
            ? { name: emergencyContact, phone: emergencyPhone }
            : null,
        },
      });

      // Create member profile
      const member = await tx.member.create({
        data: {
          userId: user.id,
          gymId,
          membershipType,
          membershipStatus: MembershipStatus.active,
          joinDate: new Date(membershipStartDate),
          membershipExpiry: new Date(membershipEndDate),
        },
      });

      return {
        ...user,
        member,
      };
    });
  }

  async findAllMembers(query: GetMembersQueryDto, gymId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      membershipStatus,
      membershipType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      user : {userType: 'member'},
      gymId 
    };

    if (search) {
      where.user.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const memberWhere: any = {};
    if (membershipStatus) {
      where.membershipStatus = {
        equals: membershipStatus
      };
    }
    if (membershipType) {
      where.membershipType = membershipType;
    }

    // if (Object.keys(memberWhere).length > 0) {
    //   where.member = memberWhere;
    // }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: {
          id: true,
          membershipStatus: true,
          createdAt: true,
          gymId: true,
          joinDate: true,
          membershipExpiry: true,
          memberCode: true,
          membershipType: true,
          totalVisits: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              avatar: true,
              name: true,
              profileImage: true,
              status: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { user: {[sortBy]: sortOrder} },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllMembersDashboard(query: GetMembersQueryDto, gymId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      membershipStatus,
      membershipType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      user : {userType: 'member'},
      gymId 
    };

    if (search) {
      where.user.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const memberWhere: any = {};
    if (membershipStatus) {
      where.membershipStatus = {
        equals: membershipStatus
      };
    }
    if (membershipType) {
      where.membershipType = membershipType;
    }

    // if (Object.keys(memberWhere).length > 0) {
    //   where.member = memberWhere;
    // }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: {
          id: true,
          membershipStatus: true,
          createdAt: true,
          gymId: true,
          joinDate: true,
          membershipExpiry: true,
          memberCode: true,
          membershipType: true,
          totalVisits: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              avatar: true,
              name: true,
              profileImage: true,
              status: true,
              
            }
          },
          checkInRecords: {
            select: {
              id: true,
              checkInTime: true,
              checkOutTime: true,
              status: true,
              createdAt: true,
            },
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
          },
          
        },
        skip,
        take: limit,
        orderBy: { user: {[sortBy]: sortOrder} },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMemberById(id: string, gymId?: string) {
    const member = await this.prisma.user.findFirst({
      where: {
        id,
        userType: 'member',
        member: !gymId ? undefined : { some: { gymId } },
      },
      include: {
        member: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return {
      ...member,
      member: member.member.find(v => v.gymId === gymId),
    };
  }
  async findMemberByMemberId(id: string, gymId?: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        gymId,
      },
      include: {
        user: true,
        checkInRecords: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }
  async findMemberByMemberIdWithTransaction(id: string, gymId?: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        gymId,

      },
      include: {
        user: true,
        checkInRecords: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // if (member.membershipExpiry.getTime() < Date.now()) {
    //   throw new ConflictException('Your membership are expired')
    // }

    const transactionItem = await this.prisma.posTransactionItem.findMany({
      where: {
        category: ProductCategory.membership,
        endDate: {
          gte: new Date(Date.now())
        },
          transaction: {memberId: member.id}
      }
    });
    if (transactionItem.length < 1)  {
      throw new ConflictException('You do not have any montly or daily membership')
    }


    return {member, transactionItem};
  }

  async findMemberCheckInStats(userId: string) {
    const user = await this.prisma.member.findMany({
      where: {
        userId,
        membershipStatus: 'active',
      },
      include: {
        gym: true,
        checkInRecords: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
        posTransactions: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
          include: {
            items: true,
          },
        },
      },
    });

    return user;
  }

  async updateMember(id: string, updateMemberDto: UpdateMemberDto, gymId: string) {
    const member = await this.findMemberById(id, gymId);

    const {
      email,
      phone,
      name,
      emergencyContact,
      emergencyPhone,
      membershipType,
      membershipStatus,
      membershipStartDate,
      membershipEndDate,
      notes,
      isActive,
    } = updateMemberDto;

    // Check for email/phone conflicts
    if (email && email !== member.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email already exists');
      }
    }

    if (phone && phone !== member.phone) {
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
          status: isActive ? 'active' : 'inactive',
          updatedAt: new Date(),
          emergencyContact: emergencyContact
            ? { name: emergencyContact, phone: emergencyPhone }
            : undefined,
        },
      });

      // Update member profile
      const updatedMember = await tx.member.updateMany({
        where: { userId: id, gymId },
        data: {
          membershipType,
          membershipStatus,
          membershipExpiry: membershipEndDate ? new Date(membershipEndDate) : undefined,
          updatedAt: new Date(),
        },
      });

      return {
        ...updatedUser,
        member: updatedMember,
      };
    });
  }

  async deleteMember(id: string, gymId: string) {
    const member = await this.findMemberById(id, gymId);

    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'inactive',
      },
    });
  }

  async checkInOut(checkInOutDto: CheckInOutDto, gymId: string) {
    const { memberId, type } = checkInOutDto;

    const member = await this.findMemberByMemberId(memberId, gymId);

    if (member.user.status !== 'active') {
      throw new BadRequestException('Member is not active');
    }

    if (member.membershipStatus !== MembershipStatus.active) {
      throw new BadRequestException('Member membership is not active');
    }

    const memberTransaction = await this.prisma.posTransactionItem.findFirst({
      where: {
        endDate: {
          gte: new Date(Date.now())
        },
        transaction: {
          memberId,
          gymId
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })
    console.log(memberTransaction)
    if (!memberTransaction) {
      throw new ConflictException(`You are do not joined any memberhip from this gym yet`)
    }

    // Check if member has an active check-in
    const lastCheckInOut = await this.prisma.checkInRecord.findFirst({
      where: {
        memberId,
        gymId,
      },
      orderBy: { createdAt: 'desc' },
    });

    let statusCheckInOut: $Enums.CheckinStatus = lastCheckInOut.status === 'checked_in' ? 'checked_out' : 'checked_in'
    if (type) {
      if (type === CheckinStatus.checked_in) {
        if (lastCheckInOut && lastCheckInOut.status === CheckinStatus.checked_in) {
          throw new BadRequestException('Member is already checked in');
        }
      } else {
        if (!lastCheckInOut || lastCheckInOut.status === CheckinStatus.checked_out) {
          throw new BadRequestException('Member is not checked in');
        }
      }

      statusCheckInOut = type
    } 


    const checkInOut = await this.prisma.checkInRecord.create({
      data: {
        memberId,
        gymId,
        status: statusCheckInOut,
        checkInTime: statusCheckInOut === CheckinStatus.checked_in ? new Date() : null,
        checkOutTime: statusCheckInOut === CheckinStatus.checked_out ? new Date() : null,
      },
      include: {
        member: {
          include: {
            user: true,
          },
        },
      },
    });

    return {checkInOut, lastCheckInOut};
  }

  async generateQrCode(generateQrCodeDto: GenerateQrCodeDto, gymId: string) {
    const { memberId } = generateQrCodeDto;

    const member = await this.findMemberById(memberId, gymId);

    if (member.status !== 'active') {
      throw new BadRequestException('Member is not active');
    }

    // Generate QR code data
    const qrData = {
      memberId: member.id,
      gymId,
      name: member.name,
      membershipType: member.member?.membershipType,
      timestamp: new Date().toISOString(),
    };

    const qrCodeString = JSON.stringify(qrData);

    // Generate QR code image
    const qrCodeSize = this.configService.get('QR_CODE_SIZE', 200);
    const qrCodeMargin = this.configService.get('QR_CODE_MARGIN', 2);

    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeString, {
      width: qrCodeSize,
      margin: qrCodeMargin,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return {
      memberId: member.id,
      memberName: member.name,
      qrCodeData: qrData,
      qrCodeImage: qrCodeDataUrl,
      generatedAt: new Date(),
    };
  }

  async getMemberStats(gymId: string) {
    const [totalMembers, activeMembers, inactiveMembers, expiredMembers] = await Promise.all([
      this.prisma.user.count({
        where: {
          userType: 'member',
          member: {
            some: { gymId },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userType: 'member',
          status: 'active',
          member: {
            some: {
              AND: {
                gymId: gymId,
                membershipStatus: MembershipStatus.active,
              },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userType: 'member',
          status: 'inactive',
          member: {
            some: {
              gymId,
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          userType: 'member',
          member: {
            some: {
              gymId,
              membershipExpiry: {
                lt: new Date(),
              },
            },
          },
        },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      expiredMembers,
    };
  }

  async getCheckInOutHistory(memberId: string, gymId: string, page = 1, limit = 20) {
    await this.findMemberById(memberId, gymId);

    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.checkInRecord.findMany({
        where: {
          memberId,
          gymId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.checkInRecord.count({
        where: {
          memberId,
          gymId,
        },
      }),
    ]);

    return {
      data: history,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCheckInOutHistoryByMemberId(memberId: string, page = 1, limit = 20) {
    const member = await this.findMemberByMemberId(memberId);

    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.prisma.checkInRecord.findMany({
        where: {
          memberId,
          gymId: member.gymId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.checkInRecord.count({
        where: {
          memberId,
          gymId: member.gymId,
        },
      }),
    ]);

    return {
      data: history,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
