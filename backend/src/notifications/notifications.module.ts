import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsGateway } from './notifications.gateway';

// Redis yoksa BullModule'ü skip et (Vercel serverless için)
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || '6379';
const isRedisAvailable = redisHost && redisHost !== 'localhost' && redisHost !== '127.0.0.1';

const bullModuleImports = isRedisAvailable
  ? [
      BullModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          connection: {
            host: configService.get('REDIS_HOST'),
            port: parseInt(configService.get('REDIS_PORT') || '6379'),
            maxRetriesPerRequest: 0, // Retry yapma
            retryStrategy: () => null, // Retry yapma
          },
        }),
        inject: [ConfigService],
      }),
      BullModule.registerQueue({
        name: 'notifications',
      }),
    ]
  : [];

// Redis yoksa NotificationsProcessor'ı skip et (BullMQ'ya bağlı)
const providers = isRedisAvailable
  ? [NotificationsService, NotificationsProcessor, NotificationsGateway]
  : [NotificationsService, NotificationsGateway];

@Module({
  imports: [
    PrismaModule,
    ...bullModuleImports,
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers,
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}

