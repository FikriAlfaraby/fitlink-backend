import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateWalletTransactionDto,
  GetWalletTransactionsQueryDto,
  TopUpWalletDto,
  WalletStatsResponseDto,
} from './wallet.dto';
import { TransactionType, WalletType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private database: DatabaseService) {}

  // Wallet Management
  async getWalletsByGym(gymId: string) {
    const wallets = await this.database.wallet.findMany({
      where: {
        gymId,
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return wallets;
  }

  async getWalletByType(gymId: string, walletType: WalletType) {
    let wallet = await this.database.wallet.findFirst({
      where: {
        gymId,
        walletType,
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!wallet) {
      wallet = await this.database.wallet.create({
        data: {
          gymId,
          walletType,
          currentBalance: 0,
          initialBalance: 0,
          totalIncome: 0,
          totalWithdrawals: 0,
          totalFees: 0,
          todayIncome: 0,
        },
        include: {
          gym: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    return wallet;
  }

  async getWalletWithTransactions(
    gymId: string,
    walletType: WalletType,
    query: GetWalletTransactionsQueryDto,
  ) {
    const {
      page = 1,
      limit = 10,
      transactionType,
      startDate,
      endDate,
      sortBy = 'processedAt',
      sortOrder = 'desc',
    } = query;

    const wallet = await this.getWalletByType(gymId, walletType);
    const skip = (page - 1) * limit;

    const where: any = {
      walletId: wallet.id,
    };

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) {
        where.processedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.processedAt.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      this.database.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          wallet: {
            include: {
              gym: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.database.walletTransaction.count({ where }),
    ]);

    return {
      wallet,
      transactions: {
        data: transactions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // Wallet Transactions
  async createWalletTransaction(
    gymId: string,
    walletType: WalletType,
    createTransactionDto: CreateWalletTransactionDto,
  ) {
    const { amount, transactionType, description, referenceType, referenceId } =
      createTransactionDto;

    // Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Get wallet
    const wallet = await this.getWalletByType(gymId, walletType);

    // Calculate fee (example: 2.5% for withdrawals)
    let feeAmount = 0;
    if (transactionType === TransactionType.withdrawal) {
      feeAmount = amount * 0.025; // 2.5% fee
    }

    const netAmount = transactionType === TransactionType.withdrawal ? amount - feeAmount : amount;

    // Validate sufficient balance for withdrawals
    if (
      transactionType === TransactionType.withdrawal &&
      wallet.currentBalance.toNumber() < amount
    ) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Create transaction using database transaction
    const result = await this.database.$transaction(async prisma => {
      // Create wallet transaction record
      const transaction = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType,
          amount,
          feeAmount,
          netAmount,
          description,
          referenceType,
          referenceId,
        },
        include: {
          wallet: {
            include: {
              gym: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Update wallet balances
      const updateData: any = {};

      if (transactionType === TransactionType.income) {
        updateData.currentBalance = { increment: amount };
        updateData.totalIncome = { increment: amount };
        updateData.todayIncome = { increment: amount };
      } else if (transactionType === TransactionType.withdrawal) {
        updateData.currentBalance = { decrement: amount };
        updateData.totalWithdrawals = { increment: amount };
        updateData.totalFees = { increment: feeAmount };
      } else if (transactionType === TransactionType.fee) {
        updateData.currentBalance = { decrement: amount };
        updateData.totalFees = { increment: amount };
      } else if (transactionType === TransactionType.adjustment) {
        if (amount > 0) {
          updateData.currentBalance = { increment: amount };
        } else {
          updateData.currentBalance = { decrement: Math.abs(amount) };
        }
      }

      await prisma.wallet.update({
        where: { id: wallet.id },
        data: updateData,
      });

      return transaction;
    });

    return result;
  }

  async topUpWallet(gymId: string, topUpDto: TopUpWalletDto) {
    const { walletType, amount, description, referenceType, referenceId } = topUpDto;

    return await this.createWalletTransaction(gymId, walletType, {
      amount,
      transactionType: TransactionType.income,
      description: description || 'Wallet top up',
      referenceType,
      referenceId,
    });
  }

  async withdrawFromWallet(
    gymId: string,
    walletType: WalletType,
    amount: number,
    description?: string,
    referenceType?: any,
    referenceId?: string,
  ) {
    return await this.createWalletTransaction(gymId, walletType, {
      amount,
      transactionType: TransactionType.withdrawal,
      description: description || 'Wallet withdrawal',
      referenceType,
      referenceId,
    });
  }

  async adjustWallet(
    gymId: string,
    walletType: WalletType,
    amount: number,
    description?: string,
    referenceType?: any,
    referenceId?: string,
  ) {
    return await this.createWalletTransaction(gymId, walletType, {
      amount,
      transactionType: TransactionType.adjustment,
      description: description || 'Wallet adjustment',
      referenceType,
      referenceId,
    });
  }

  // Transaction History
  async findAllTransactions(gymId: string, query: GetWalletTransactionsQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      walletType,
      transactionType,
      startDate,
      endDate,
      sortBy = 'processedAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {
      wallet: {
        gymId,
      },
    };

    if (walletType) {
      where.wallet.walletType = walletType;
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) {
        where.processedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.processedAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          referenceId: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.database.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          wallet: {
            include: {
              gym: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.database.walletTransaction.count({ where }),
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

  async findOneTransaction(id: string, gymId?: string) {
    const where: any = { id };

    if (gymId) {
      where.wallet = {
        gymId,
      };
    }

    const transaction = await this.database.walletTransaction.findFirst({
      where,
      include: {
        wallet: {
          include: {
            gym: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  // Statistics
  async getWalletStats(gymId: string): Promise<WalletStatsResponseDto> {
    const where = {
      wallet: {
        gymId,
      },
    };

    const [totalTransactions, totalIncome, totalWithdrawals, totalFees, totalVolume] =
      await Promise.all([
        this.database.walletTransaction.count({ where }),
        this.database.walletTransaction.count({
          where: {
            ...where,
            transactionType: TransactionType.income,
          },
        }),
        this.database.walletTransaction.count({
          where: {
            ...where,
            transactionType: TransactionType.withdrawal,
          },
        }),
        this.database.walletTransaction.count({
          where: {
            ...where,
            transactionType: TransactionType.fee,
          },
        }),
        this.database.walletTransaction.aggregate({
          where,
          _sum: {
            amount: true,
          },
        }),
      ]);

    // Get total wallet balance for the gym
    const totalWalletBalance = await this.database.wallet.aggregate({
      where: {
        gymId,
      },
      _sum: {
        currentBalance: true,
      },
    });

    return {
      totalTransactions,
      totalIncome,
      totalWithdrawals,
      totalFees,
      totalVolume: totalVolume._sum.amount ? Number(totalVolume._sum.amount) : 0,
      totalWalletBalance: totalWalletBalance._sum.currentBalance
        ? Number(totalWalletBalance._sum.currentBalance)
        : 0,
    };
  }

  // Reset today income (should be called daily via cron job)
  async resetTodayIncome(gymId?: string) {
    const where: any = {};
    if (gymId) {
      where.gymId = gymId;
    }

    await this.database.wallet.updateMany({
      where,
      data: {
        todayIncome: 0,
      },
    });
  }
}
