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

    super(options);
  }

  async onModuleInit() {
    await this.$connect();
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
      const params = parsed.searchParams;

      const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || '10';
      const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || '0';

      const hadLimit = params.has('connection_limit');
      const hadTimeout = params.has('pool_timeout');

      if (!hadLimit) {
        params.set('connection_limit', connectionLimit);
      }

      if (!hadTimeout) {
        params.set('pool_timeout', poolTimeout);
      }

      parsed.search = params.toString();

      if (!hadLimit || !hadTimeout) {
        this.logger.log(
          `Prisma connection pool tuned (connection_limit=${params.get('connection_limit')}, pool_timeout=${params.get('pool_timeout')})`,
        );
      }

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











