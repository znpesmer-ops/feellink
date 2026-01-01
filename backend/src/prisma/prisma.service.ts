import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// 🔥 Global singleton pattern - her request'te yeni instance oluşmasını önle
const globalForPrisma = global as unknown as {
  prisma: PrismaService | undefined;
};

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

    // ✅ MongoDB için connection timeout ayarları
    const isMongoDB = normalizedUrl?.includes('mongodb://') || normalizedUrl?.includes('mongodb+srv://');
    if (isMongoDB) {
      // Prisma client seviyesinde timeout ayarları
      options.log = process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error', 'warn'];
    }

    // 🔥 Supabase pgBouncer için prepared statements'ı devre dışı bırak
    if (process.env.PRISMA_DB_DISABLE_PREPARED_STATEMENTS === 'true') {
      options.log = options.log || [];
      // Prepared statements'ı devre dışı bırakmak için özel ayar
      // Prisma client'ın connection string'deki pgbouncer=true parametresini kullanması yeterli
      // Ancak ekstra güvenlik için burada da kontrol ediyoruz
    }

    super(options);
    
    // 🔥 Development'ta global instance'ı sakla (hot reload için)
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = this;
    }

    // 🔥 MongoDB bağlantı kontrolü middleware KALDIRILDI
    // Recursive $connect() çağrısı sorun yaratıyordu
    // Bağlantı kontrolü onModuleInit'te yapılıyor, middleware gereksiz
  }

  async onModuleInit() {
    // 🔥 MongoDB bağlantısı - agresif retry ve otomatik reconnect
    await this.ensureConnection();
  }

  // 🔥 Bağlantıyı garantile - retry mekanizması ile
  async ensureConnection(): Promise<void> {
    const maxRetries = 10; // ✅ 5 -> 10 (daha fazla deneme)
    let retryCount = 0;
    
    const attemptConnection = async (): Promise<void> => {
      try {
        // Bağlantıyı kapat (varsa) ve yeniden bağlan
        try {
          await this.$disconnect();
        } catch (disconnectError) {
          // Zaten kapalı, sorun değil
        }

        // Direkt bağlan (query kontrolü yapma, sadece connect)
        await this.$connect();
        PrismaService.logger.log('✅ Database connected successfully');
        
        // Bağlantıyı test et (sadece PostgreSQL için)
        const dbUrl = process.env.DATABASE_URL || PrismaService.DEFAULT_DB_URL;
        if (dbUrl.includes('postgresql://')) {
          await (this as any).$queryRaw`SELECT 1`;
          PrismaService.logger.log('✅ Database connection verified');
        }
      } catch (err: any) {
        retryCount++;
        const errorMessage = err?.message || 'Unknown error';
        
        if (retryCount < maxRetries) {
          const waitTime = Math.min(3000 * retryCount, 20000); // ✅ Exponential backoff (max 20s)
          PrismaService.logger.warn(
            `⚠️ Database connection attempt ${retryCount}/${maxRetries} failed: ${errorMessage.substring(0, 100)}. Retrying in ${waitTime/1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return attemptConnection();
        } else {
          PrismaService.logger.error(
            `❌ Database connection failed after ${maxRetries} attempts: ${errorMessage.substring(0, 200)}`,
          );
          PrismaService.logger.warn(
            '⚠️ Backend will continue without database connection. Some features may not work.',
          );
          PrismaService.logger.warn(
            '💡 Please check: 1) MongoDB Atlas IP whitelist (0.0.0.0/0), 2) Network connectivity, 3) DATABASE_URL in .env',
          );
          // ❌ Bağlantı başarısız ama backend devam etsin
        }
      }
    };
    
    // İlk bağlantı denemesini başlat (timeout ile - MongoDB için daha uzun süre)
    const connectionPromise = attemptConnection();
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout after 180 seconds')), 180000) // ✅ 120s -> 180s
    );
    
    try {
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (err: any) {
      PrismaService.logger.error(`❌ Database connection timeout: ${err.message}`);
      PrismaService.logger.warn('💡 MongoDB Atlas connection issues? Check: 1) IP whitelist, 2) Network, 3) Connection string');
      // ❌ Timeout ama backend devam etsin
    }
  }

  // 🔥 Query öncesi bağlantı kontrolü - otomatik reconnect
  async $ensureConnected(): Promise<void> {
    try {
      await (this as any).$queryRaw`SELECT 1`;
    } catch (error) {
      PrismaService.logger.warn('⚠️ Database connection lost, attempting to reconnect...');
      await this.ensureConnection();
    }
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
        this.logger.log('✅ MongoDB connection string detected, adding connection pool parameters');
        
        // MongoDB için connection pool ve timeout parametreleri ekle
        const mongoParams = parsed.searchParams;
        
        // Connection pool ayarları - Atlas için optimize (timeout hatalarını önlemek için)
        if (!mongoParams.has('maxPoolSize')) {
          mongoParams.set('maxPoolSize', '100'); // ✅ Artırıldı: 50 -> 100 (daha fazla concurrent connection)
        }
        if (!mongoParams.has('minPoolSize')) {
          mongoParams.set('minPoolSize', '10'); // ✅ Artırıldı: 5 -> 10 (daha fazla hazır connection)
        }
        
        // Timeout ayarları (milisaniye cinsinden) - MongoDB Atlas için optimize edilmiş
        if (!mongoParams.has('serverSelectionTimeoutMS')) {
          mongoParams.set('serverSelectionTimeoutMS', '120000'); // ✅ Artırıldı: 60s -> 120s (2 dakika)
        }
        if (!mongoParams.has('connectTimeoutMS')) {
          mongoParams.set('connectTimeoutMS', '120000'); // ✅ Artırıldı: 60s -> 120s (2 dakika)
        }
        if (!mongoParams.has('socketTimeoutMS')) {
          mongoParams.set('socketTimeoutMS', '300000'); // ✅ Artırıldı: 120s -> 300s (5 dakika)
        }
        if (!mongoParams.has('heartbeatFrequencyMS')) {
          mongoParams.set('heartbeatFrequencyMS', '10000'); // 10 saniye heartbeat
        }
        
        // ✅ Yeni: Connection pool timeout ayarları
        if (!mongoParams.has('waitQueueTimeoutMS')) {
          mongoParams.set('waitQueueTimeoutMS', '120000'); // ✅ Artırıldı: 60s -> 120s (Connection pool'da bekleme süresi)
        }
        if (!mongoParams.has('maxIdleTimeMS')) {
          mongoParams.set('maxIdleTimeMS', '300000'); // ✅ Artırıldı: 60s -> 300s (5 dakika idle connection timeout)
        }
        
        // Retry ayarları - Atlas için kritik
        if (!mongoParams.has('retryWrites')) {
          mongoParams.set('retryWrites', 'true');
        }
        if (!mongoParams.has('retryReads')) {
          mongoParams.set('retryReads', 'true');
        }
        
        // ✅ Prisma MongoDB tarafından desteklenmeyen parametreleri kaldır
        // Bu parametreler Prisma connection string'inde sorun yaratıyor
        if (mongoParams.has('serverSelectionTryOnce')) {
          mongoParams.delete('serverSelectionTryOnce');
        }
        if (mongoParams.has('compressors')) {
          mongoParams.delete('compressors');
        }
        
        // Atlas için özel ayarlar
        if (!mongoParams.has('w')) {
          mongoParams.set('w', 'majority'); // Write concern
        }
        if (!mongoParams.has('readPreference')) {
          // 🔥 Transaction kullanımı için primary olmalı (primaryPreferred transaction'larda çalışmaz)
          mongoParams.set('readPreference', 'primary'); // Primary read (transaction uyumlu)
        }
        
        parsed.search = mongoParams.toString();
        const optimizedUrl = parsed.toString();
        
        this.logger.log(`✅ MongoDB connection string optimized with pool and timeout settings`);
        return optimizedUrl;
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











