import { Module } from '@nestjs/common';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, LimitsModule, MailModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}



