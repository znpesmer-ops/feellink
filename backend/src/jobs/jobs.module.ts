import { Module } from '@nestjs/common';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LimitsModule } from '../limits/limits.module';

@Module({
  imports: [PrismaModule, LimitsModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}



