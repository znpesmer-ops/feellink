import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL, // ❗ ZORUNLU
        },
      },
    });
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      this.logger.error('❌ DATABASE_URL is missing');
      throw new Error('DATABASE_URL is not set');
    }

    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected');
    } catch (err) {
      this.logger.error('❌ Prisma connection failed', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
