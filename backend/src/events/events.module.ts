import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsReminderService } from './events-reminder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, LimitsModule, NotificationsModule, MailModule],
  controllers: [EventsController],
  providers: [EventsService, EventsReminderService],
})
export class EventsModule {}

