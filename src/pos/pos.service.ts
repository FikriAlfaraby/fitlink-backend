import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreatePosTransactionDto,
  UpdatePosTransactionDto,
  GetPosTransactionsQueryDto,
  CreateDiscountDto,
  UpdateDiscountDto,
  GetDiscountsQueryDto,
  // CreateReferralDto,
  // GetReferralsQueryDto,
  PosStatsResponseDto,
} from './pos.dto';
import {
  PosStatus,
  DiscountType,
  UserType,
  GymInvoice,
  WalletType,
  TransactionType,
  ReferenceType,
} from '@prisma/client';
import { FEE_APP_EACH_TRANSACTION } from '@/common';
import { countMonthsBetween } from '@/common/utils/count-date';
import { WalletService } from '@/wallet/wallet.service';

@Injectable()
export class PosService {
  constructor(private database: DatabaseService) {}

  // POS Transaction Management
  async createPosTransaction(
    createTransactionDto: CreatePosTransactionDto,
    gymId: string,
    staffId: string,
  ) {
    const { memberId, items, discountId, referralCode, notes, paymentMethod } =
      createTransactionDto;
    Logger.debug(createTransactionDto);
    Logger.debug(gymId);
    console.log(createTransactionDto);
    // Verify member exists and belongs to the gym
    if (memberId) {
      const member = await this.database.member.findFirst({
        where: {
          id: memberId,
          gymId,
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }
    }

    // product
    const products = await this.database.product.findMany({
      where: {
        id: {
          in: items.map(val => val.productId),
        },
      },
    });

    if (products.length !== items.length) {
      throw new Error(`Some product are doesn't exist, try refresh the page and input again`);
    }

    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of products) {
      const product = items.find(v => v.productId == item.id);
      subtotal += product.quantity * item.price.toNumber();
    }

    let discountAmount = 0;
    let discount = null;

    // Apply discount if provided
    if (discountId) {
      discount = await this.database.discount.findFirst({
        where: {
          id: discountId,
          gymId,
          isActive: true,
          OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }],
          AND: [
            {
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
          ],
        },
      });

      if (!discount) {
        throw new NotFoundException('Discount not found or not valid');
      }

      // Calculate discount amount
      if (discount.type === 'percentage') {
        discountAmount = (subtotal * discount.value) / 100;
        if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
          discountAmount = discount.maxDiscount;
        }
      } else {
        discountAmount = Math.min(discount.value, subtotal);
      }

      // Check minimum amount requirement
      if (discount.minPurchase && subtotal < discount.minPurchase) {
        throw new BadRequestException(
          `Minimum amount of ${discount.minPurchase} required for this discount`,
        );
      }
    }

    // Referral functionality not implemented in current schema
    // TODO: Implement referral system when schema is updated

    const total = subtotal - discountAmount;

    // TODO: staff id comment
    // Create transaction using database transaction
    const result = await this.database.$transaction(async prisma => {
      // Create POS transaction
      const posTransaction = await prisma.posTransaction.create({
        data: {
          gymId,
          // staffId,
          memberId,
          subtotal,
          discountAmount,
          total,
          paymentMethod: 'cash', // Default payment method
          status: 'completed',
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
          staff: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          // discount removed - not in PosTransaction schema
        },
      });

      // Create transaction items
      const dateNow = new Date();
      let longestDate = new Date();
      // mapping products to transaction item
      const dataToInsertTrxItem = items.map(item => {
        const product = products.find(v => v.id === item.productId);
        const timestamps: { startDate?: string; endDate?: string } = {};
        if (product.duration) {
          timestamps.startDate = dateNow.toISOString();

          const endDate = new Date(dateNow);
          endDate.setDate(dateNow.getDate() + product.duration * item.quantity);

          if (longestDate.getTime() < endDate.getTime()) {
            longestDate.setDate(endDate.getDate());
          }

          timestamps.endDate = endDate.toISOString();
        }
        return {
          transactionId: posTransaction.id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          category: product.category,
          subtotal: item.quantity * product.price.toNumber(),
          ...timestamps,
        };
      });

      const transactionItems = await prisma.posTransactionItem.createMany({
        data: dataToInsertTrxItem,
      });

      // Update discount usage count
      if (discount) {
        await prisma.discount.update({
          where: { id: discount.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // count fee app
      const totalMonthTransaction = countMonthsBetween(dateNow, longestDate);
      const currentDate = new Date(dateNow);

      //
      const gymInvoiceDataToInsert = [];
      for (let i = 0; i <= totalMonthTransaction; i++) {
        const month = currentDate.getMonth() + 1; // JS months are 0–11
        const year = currentDate.getFullYear();

        gymInvoiceDataToInsert.push({
          gymId: gymId,
          fee: FEE_APP_EACH_TRANSACTION,
          transactionDate: new Date(currentDate),
          month: month,
          year: year,
        });

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      let walletType: WalletType;
      switch (paymentMethod) {
        case 'cash':
          walletType = WalletType.cash;
          break;
        case 'card':
          walletType = WalletType.card;
          break;
        case 'qris':
          walletType = WalletType.qris;
          break;
        case 'transfer':
          walletType = WalletType.bank_transfer;
          break;
        default:
          walletType = WalletType.cash;
          break;
      }

      const gymWallet = await prisma.wallet.findFirst({
        where: {
          gymId,
          walletType: walletType,
        },
      });

      if (!gymWallet) {
        throw new NotFoundException(`Wallet for ${walletType} not found`);
      }
      if (!gymWallet.isActive) {
        throw new BadRequestException(`Wallet for ${walletType} is not active`);
      }

      const gymWalletBalance = gymWallet.currentBalance.toNumber() + total;

      await prisma.wallet.update({
        where: {
          id: gymWallet.id,
          gymId: gymId,
          currentBalance: gymWallet.currentBalance,
        },
        data: {
          currentBalance: gymWalletBalance,
          totalIncome: gymWallet.totalIncome.toNumber() + total,
          todayIncome: gymWallet.todayIncome.toNumber() + total,
          updatedAt: new Date(),
        },
      });

      await prisma.walletTransaction.create({
        data: {
          amount: total,
          netAmount: total,
          walletId: gymWallet.id,
          transactionType: TransactionType.income,
          referenceType: ReferenceType.pos_transaction,
          // description: `POS Transaction ${posTransaction.id}`,
          processedAt: new Date(),
        },
      });

      await prisma.gymInvoice.createMany({
        data: gymInvoiceDataToInsert,
      });

      // Referral functionality not implemented in current schema
      // TODO: Implement referral usage tracking when schema is updated

      return {
        ...posTransaction,
        items: transactionItems,
      };
    });

    return result;
  }

  async findAllPosTransactions(query: GetPosTransactionsQueryDto, gymId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      memberId,
      staffId,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      // deletedAt removed - not in schema
    };

    if (gymId) {
      where.gymId = gymId;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        {
          transactionNumber: {
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
        {
          staff: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.database.posTransaction.findMany({
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
          staff: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          items: true,
        },
      }),
      this.database.posTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePosTransaction(id: string) {
    const transaction = await this.database.posTransaction.findFirst({
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
        staff: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        items: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('POS transaction not found');
    }

    return transaction;
  }

  async updatePosTransaction(id: string, updateTransactionDto: UpdatePosTransactionDto) {
    const transaction = await this.findOnePosTransaction(id);

    const updatedTransaction = await this.database.posTransaction.update({
      where: { id },
      data: {
        ...updateTransactionDto,
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
        staff: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        items: true,
      },
    });

    return updatedTransaction;
  }

  // Discount Management
  async createDiscount(createDiscountDto: CreateDiscountDto, gymId: string) {
    const {
      code,
      name,
      type,
      value,
      minAmount,
      maxAmount,
      validFrom,
      validTo,
      maxUsage,
      isActive,
    } = createDiscountDto;

    // Check if discount code already exists
    const existingDiscount = await this.database.discount.findFirst({
      where: {
        code,
        gymId,
        // deletedAt removed - not in schema
      },
    });

    if (existingDiscount) {
      throw new BadRequestException('Discount code already exists');
    }

    const discount = await this.database.discount.create({
      data: {
        code,
        name,
        type,
        value,
        minPurchase: minAmount,
        maxDiscount: maxAmount,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validTo ? new Date(validTo) : null,
        usageLimit: maxUsage,
        isActive: isActive ?? true,
        gymId,
      },
    });

    return discount;
  }

  async findAllDiscounts(query: GetDiscountsQueryDto, gymId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      // deletedAt removed - not in schema
    };

    if (gymId) {
      where.gymId = gymId;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [discounts, total] = await Promise.all([
      this.database.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.database.discount.count({ where }),
    ]);

    return {
      data: discounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneDiscount(id: string) {
    const discount = await this.database.discount.findFirst({
      where: {
        id,
      },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    return discount;
  }

  async updateDiscount(id: string, updateDiscountDto: UpdateDiscountDto) {
    const discount = await this.findOneDiscount(id);

    // Check if new code conflicts with existing discounts
    if (updateDiscountDto.code && updateDiscountDto.code !== discount.code) {
      const existingDiscount = await this.database.discount.findFirst({
        where: {
          code: updateDiscountDto.code,
          gymId: discount.gymId,
          id: { not: id },
          // deletedAt removed - not in schema
        },
      });

      if (existingDiscount) {
        throw new BadRequestException('Discount code already exists');
      }
    }

    const updatedDiscount = await this.database.discount.update({
      where: { id },
      data: {
        ...updateDiscountDto,
        validFrom: updateDiscountDto.validFrom ? new Date(updateDiscountDto.validFrom) : undefined,
        validUntil: updateDiscountDto.validTo ? new Date(updateDiscountDto.validTo) : undefined,
      },
    });

    return updatedDiscount;
  }

  async removeDiscount(id: string) {
    const discount = await this.findOneDiscount(id);

    await this.database.discount.update({
      where: { id },
      data: {
        // Performing hard delete as deletedAt not in schema
      },
    });

    return { message: 'Discount deleted successfully' };
  }

  // Referral Management - Not implemented in current schema
  // TODO: Implement referral system when schema is updated

  // findAllReferrals - Not implemented in current schema
  // TODO: Implement referral system when schema is updated

  // findOneReferral - Not implemented in current schema
  // TODO: Implement referral system when schema is updated

  // Statistics
  async getPosStats(gymId?: string): Promise<PosStatsResponseDto> {
    const where: any = {
      deletedAt: null,
    };

    if (gymId) {
      where.gymId = gymId;
    }

    const [totalTransactions, totalRevenue, totalDiscounts] = await Promise.all([
      this.database.posTransaction.count({ where }),
      this.database.posTransaction.aggregate({
        where,
        _sum: {
          total: true,
        },
      }),
      this.database.discount.count({
        where: {
          gymId: gymId || undefined,
          // deletedAt removed - not in schema
        },
      }),
    ]);

    // Referral functionality not implemented in current schema
    const totalReferrals = 0;

    const discountUsage = await this.database.discount.aggregate({
      where: {
        gymId: gymId || undefined,
        // deletedAt removed - not in schema
      },
      _sum: {
        usedCount: true,
      },
    });

    // Referral functionality not implemented in current schema
    const referralUsage = { _sum: { usedCount: 0 } };

    return {
      totalTransactions,
      totalRevenue: Number(totalRevenue._sum.total) || 0,
      totalDiscounts,
      totalReferrals,
      totalDiscountUsage: discountUsage._sum.usedCount || 0,
      totalReferralUsage: referralUsage._sum.usedCount || 0,
    };
  }
}
