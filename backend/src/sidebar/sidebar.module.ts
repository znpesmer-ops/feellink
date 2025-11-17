import { Module, forwardRef } from '@nestjs/common';
import { SidebarController } from './sidebar.controller';
import { SidebarService } from './sidebar.service';
import { SidebarGateway } from './sidebar.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AdminModule)],
  controllers: [SidebarController],
  providers: [SidebarService, SidebarGateway],
  exports: [SidebarService, SidebarGateway],
})
export class SidebarModule {}

