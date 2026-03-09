import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url =
      process.env.DATABASE_URL ||
      process.env.MONGODB_URI ||
      process.env.DATABASE_URI;
    super({
      datasources: {
        db: { url: url || undefined },
      },
    });
  }

  async onModuleInit() {
    const url =
      process.env.DATABASE_URL ||
      process.env.MONGODB_URI ||
      process.env.DATABASE_URI;
    if (!url || url.trim() === '') {
      this.logger.warn('⚠️ DATABASE_URL (veya MONGODB_URI / DATABASE_URI) eksik');
      if (process.env.VERCEL) return;
      throw new Error('DATABASE_URL is not set');
    }
    this.logger.log(`📦 Prisma bağlantı denenecek (env: ${process.env.DATABASE_URL ? 'DATABASE_URL' : process.env.MONGODB_URI ? 'MONGODB_URI' : 'DATABASE_URI'})`);
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected');
    } catch (err) {
      this.logger.error('❌ Prisma connection failed', err);
      if (process.env.VERCEL) return;
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
