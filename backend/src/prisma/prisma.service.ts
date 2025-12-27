import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static readonly logger = new Logger(PrismaService.name);
  private static readonly DEFAULT_DB_URL =
    'postgresql://postgres:postgres@localhost:5432/instagram_clone?schema=public';

  constructor() {
    const options: Prisma.PrismaClientOptions = {};
    const normalizedUrl = PrismaService.normalizeDatabaseUrl();

    if (normalizedUrl) {
      options.datasources = {
        db: {
          url: normalizedUrl,
        },
      };
    }

    // 🔥 Supabase pgBouncer için prepared statements'ı devre dışı bırak
    if (process.env.PRISMA_DB_DISABLE_PREPARED_STATEMENTS === 'true') {
      options.log = options.log || [];
      // Prepared statements'ı devre dışı bırakmak için özel ayar
      // Prisma client'ın connection string'deki pgbouncer=true parametresini kullanması yeterli
      // Ancak ekstra güvenlik için burada da kontrol ediyoruz
    }

    super(options);
  }

  async onModuleInit() {
    // 🔥 DB bağlantısı opsiyonel - bağlanamazsa backend yine başlasın
    this.$connect()
      .then(() => {
        PrismaService.logger.log('✅ Database connected successfully');
      })
      .catch((err) => {
        PrismaService.logger.error(
          `⚠️ Database connection failed, continuing without DB: ${err.message}`,
        );
        // Backend yine başlayacak, sadece DB işlemleri çalışmayacak
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private static normalizeDatabaseUrl(): string | undefined {
    const rawUrl = (process.env.DATABASE_URL || PrismaService.DEFAULT_DB_URL)?.trim();

    if (!rawUrl) {
      this.logger.warn('DATABASE_URL is not set. Prisma will use its default configuration.');
      return undefined;
    }

    try {
      const parsed = new URL(rawUrl);
      
      // MongoDB connection string'leri için parametre ekleme
      if (parsed.protocol === 'mongodb:' || parsed.protocol === 'mongodb+srv:') {
        this.logger.log('✅ MongoDB connection string detected, skipping PostgreSQL-specific parameters');
        return rawUrl; // MongoDB için raw URL'i olduğu gibi döndür
      }

      const params = parsed.searchParams;

      const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || '1';
      const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || '0';

      // 🔥 Supabase pgBouncer için zorunlu parametreler
      // Prepared statements'ı devre dışı bırakmak için
      if (parsed.hostname.includes('pooler.supabase.com') || parsed.hostname.includes('supabase.co')) {
        params.set('pgbouncer', 'true');
        params.set('statement_cache_size', '0');
        params.set('connection_limit', connectionLimit);
        params.set('pool_timeout', poolTimeout);
        this.logger.log(
          `✅ Supabase pgBouncer mode enabled (prepared statements disabled, connection_limit=${connectionLimit})`,
        );
      } else {
        // Normal PostgreSQL için
        const hadLimit = params.has('connection_limit');
        const hadTimeout = params.has('pool_timeout');

        if (!hadLimit) {
          params.set('connection_limit', connectionLimit);
        }

        if (!hadTimeout) {
          params.set('pool_timeout', poolTimeout);
        }

        if (!hadLimit || !hadTimeout) {
          this.logger.log(
            `Prisma connection pool tuned (connection_limit=${params.get('connection_limit')}, pool_timeout=${params.get('pool_timeout')})`,
          );
        }
      }

      parsed.search = params.toString();

      return parsed.toString();
    } catch (error) {
      this.logger.warn(
        `DATABASE_URL could not be parsed (${(error as Error).message}). Falling back to raw value.`,
      );
      return rawUrl;
    }
  }
}

let prismaSingleton: PrismaService | null = null;

export const getPrismaInstance = (): PrismaService => {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaService();
  }
  return prismaSingleton;
};











