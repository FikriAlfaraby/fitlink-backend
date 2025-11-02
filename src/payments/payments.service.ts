import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  GetPaymentsQueryDto,
  CreateBillingDto,
  UpdateBillingDto,
  GetBillingsQueryDto,
  PaymentStatsResponseDto,
} from './payments.dto';
import { PaymentStatus, PaymentMethod, PaymentType, BillStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private database: DatabaseService) {}

  // Payment Management
  async createPayment(createPaymentDto: CreatePaymentDto, gymId: string) {
    const { memberId, amount, method, description } = createPaymentDto;

    // Verify member exists and belongs to the gym
    const member = await this.database.member.findFirst({
      where: {
        id: memberId,
        gymId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Generate payment reference
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const payment = await this.database.payment.create({
      data: {
        memberId,
        gymId,
        amount,
        type: PaymentType.membership,
        method,
        status: PaymentStatus.pending,
        description,
        referenceId: paymentReference,
      },
      include: {
        member: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return payment;
  }

  async findAllPayments(query: GetPaymentsQueryDto, gymId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      memberId,
      status,
      method,
      startDate,
      endDate,
      sortBy = 'paymentDate',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      deletedAt: null,
    };

    if (gymId) {
      where.gymId = gymId;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        {
          paymentReference: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          member: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      this.database.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          member: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          gym: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.database.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePayment(id: string) {
    const payment = await this.database.payment.findFirst({
      where: {
        id,
      },
      include: {
        member: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.findOnePayment(id);

    const updatedPayment = await this.database.payment.update({
      where: { id },
      data: {
        ...updatePaymentDto,
      },
      include: {
        member: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedPayment;
  }

  async removePayment(id: string) {
    const payment = await this.findOnePayment(id);

    // Check if payment can be deleted (only pending payments)
    if (payment.status === PaymentStatus.completed) {
      throw new BadRequestException('Cannot delete completed payment');
    }

    await this.database.payment.delete({
      where: { id },
    });

    return { message: 'Payment deleted successfully' };
  }

  // Bill Management
  async createBilling(createBillingDto: CreateBillingDto, gymId: string) {
    const { memberId, membershipType, amount, dueDate, autoPayEnabled } = createBillingDto;

    // Verify member exists and belongs to the gym
    const member = await this.database.member.findFirst({
      where: {
        id: memberId,
        gymId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const bill = await this.database.bill.create({
      data: {
        memberId,
        gymId,
        membershipType,
        amount,
        dueDate: new Date(dueDate),
        status: BillStatus.pending,
        autoPayEnabled: autoPayEnabled || false,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return bill;
  }

  async findAllBillings(query: GetBillingsQueryDto, gymId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      memberId,
      membershipType,
      status,
      startDate,
      endDate,
      sortBy = 'dueDate',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (gymId) {
      where.gymId = gymId;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (membershipType) {
      where.membershipType = membershipType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) {
        where.dueDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        {
          membershipType: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          member: {
            user: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const [bills, total] = await Promise.all([
      this.database.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.database.bill.count({ where }),
    ]);

    return {
      data: bills,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneBilling(id: string) {
    const bill = await this.database.bill.findFirst({
      where: {
        id,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill record not found');
    }

    return bill;
  }

  async updateBilling(id: string, updateBillingDto: UpdateBillingDto) {
    const bill = await this.findOneBilling(id);

    const updatedBill = await this.database.bill.update({
      where: { id },
      data: {
        ...updateBillingDto,
        dueDate: updateBillingDto.dueDate ? new Date(updateBillingDto.dueDate) : undefined,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return updatedBill;
  }

  async removeBilling(id: string) {
    const bill = await this.findOneBilling(id);

    // Since there's no direct relation between Payment and Bill,
    // we can safely delete the bill without checking for associated payments

    await this.database.bill.delete({
      where: { id },
    });

    return { message: 'Bill record deleted successfully' };
  }

  // Statistics
  async getPaymentStats(gymId?: string): Promise<PaymentStatsResponseDto> {
    const where: any = {};

    if (gymId) {
      where.gymId = gymId;
    }

    const [totalPayments, completedPayments, pendingPayments, totalRevenue] = await Promise.all([
      this.database.payment.count({ where }),
      this.database.payment.count({
        where: {
          ...where,
          status: PaymentStatus.completed,
        },
      }),
      this.database.payment.count({
        where: {
          ...where,
          status: PaymentStatus.pending,
        },
      }),
      this.database.payment.aggregate({
        where: {
          ...where,
          status: PaymentStatus.completed,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const billWhere = { ...where };
    const [totalBillings, pendingBillings, overdueBillings] = await Promise.all([
      this.database.bill.count({ where: billWhere }),
      this.database.bill.count({
        where: {
          ...billWhere,
          status: BillStatus.pending,
        },
      }),
      this.database.bill.count({
        where: {
          ...billWhere,
          status: BillStatus.pending,
          dueDate: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      totalRevenue: Number(totalRevenue._sum.amount) || 0,
      totalBillings,
      pendingBillings,
      overdueBillings,
    };
  }
}
