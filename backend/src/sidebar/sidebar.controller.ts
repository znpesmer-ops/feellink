import { Controller, Get } from '@nestjs/common';
import { SidebarService } from './sidebar.service';

@Controller('sidebar')
export class SidebarController {
  constructor(private readonly sidebarService: SidebarService) {}

  @Get('global')
  async getGlobalSidebarData() {
    return this.sidebarService.getGlobalData();
  }
}

