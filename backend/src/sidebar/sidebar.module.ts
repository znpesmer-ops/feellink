import { Module } from '@nestjs/common';
import { SidebarController } from './sidebar.controller';
import { SidebarService } from './sidebar.service';
import { SidebarGateway } from './sidebar.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SidebarController],
  providers: [SidebarService, SidebarGateway],
  exports: [SidebarService, SidebarGateway],
})
export class SidebarModule {}

