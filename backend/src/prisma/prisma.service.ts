import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL || process.env.DATABASE_URI;

    super({
      datasources: {
        db: { url: url || undefined },
      },
    });
  }

  async onModuleInit() {
    const url = process.env.DATABASE_URL || process.env.DATABASE_URI;
    if (!url || url.trim() === '') {
      this.logger.warn('⚠️ DATABASE_URL eksik');
      if (process.env.VERCEL) return;
      throw new Error('DATABASE_URL is not set');
    }
    if (process.env.VERCEL) {
      // Vercel'de bağlantıyı arka planda başlat (cold start'ı bloklamadan ön ısıtma)
      this.$connect()
        .then(() => this.logger.log('✅ Prisma pre-warmed (background)'))
        .catch(() => this.logger.warn('⚠️ Prisma pre-warm failed (will lazy-connect)'));
      return;
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
