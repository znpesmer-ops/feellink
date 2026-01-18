import { Module } from '@nestjs/common';
import { HighlightsController } from './highlights.controller';
import { HighlightsService } from './highlights.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [HighlightsController],
  providers: [HighlightsService, PrismaService],
  exports: [HighlightsService],
})
export class HighlightsModule {}
