import { Module, forwardRef } from '@nestjs/common';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';
import { MailModule } from '../mail/mail.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, LimitsModule, MailModule, forwardRef(() => ChatModule)],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}



