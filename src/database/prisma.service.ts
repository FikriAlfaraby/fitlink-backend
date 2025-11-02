import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method for transactions
  async executeTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  // Helper method for soft delete (if needed)
  async softDelete(model: string, where: any) {
    return (this as any)[model].update({
      where,
      data: {
        deletedAt: new Date(),
        status: 'inactive'
      }
    });
  }

  // Helper method for pagination
  async paginate<T>(
    model: string,
    {
      page = 1,
      limit = 10,
      where = {},
      orderBy = {},
      include = {},
      select = undefined
    }: {
      page?: number;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    } = {}
  ) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      (this as any)[model].findMany({
        skip,
        take: limit,
        where,
        orderBy,
        include,
        select
      }),
      (this as any)[model].count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }
}