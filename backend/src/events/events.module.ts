import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, LimitsModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

