import { Module, forwardRef } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketMailerService } from './ticket-mailer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule)],
  controllers: [TicketsController],
  providers: [TicketsService, TicketMailerService],
})
export class TicketsModule {}

