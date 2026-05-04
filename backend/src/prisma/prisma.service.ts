import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let url =
      process.env.DATABASE_URL ||
      process.env.MONGODB_URI ||
      process.env.DATABASE_URI;

    // Serverless için MongoDB bağlantı parametrelerini optimize et
    if (url && process.env.VERCEL) {
      try {
        const parsed = new URL(url);
        // Bağlantı havuzunu küçük tut, timeout'ları kısa ayarla
        parsed.searchParams.set('connectTimeoutMS', '10000');
        parsed.searchParams.set('socketTimeoutMS', '30000');
        parsed.searchParams.set('serverSelectionTimeoutMS', '10000');
        parsed.searchParams.set('maxPoolSize', '5');
        url = parsed.toString();
      } catch {
        // URL parse edilemezse orijinali kullan
      }
    }

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
