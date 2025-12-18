import { Module } from '@nestjs/common';
import { EmailChangeService } from './email-change.service';
import { EmailChangeController } from './email-change.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [EmailChangeController],
  providers: [EmailChangeService],
  exports: [EmailChangeService],
})
export class EmailChangeModule {}

