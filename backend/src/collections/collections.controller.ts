import { Controller, Get, Post, Body, Put, Delete, Param, UseGuards } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}

  @Get('my')
  async getMyCollections(@CurrentUser() user: any) {
    return this.collectionsService.getMyCollections(user.id);
  }

  @Post()
  async createCollection(@CurrentUser() user: any, @Body() data: any) {
    return this.collectionsService.createCollection(user.id, data);
  }

  @Put(':id')
  async updateCollection(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.collectionsService.updateCollection(user.id, id, data);
  }

  @Delete(':id')
  async deleteCollection(@CurrentUser() user: any, @Param('id') id: string) {
    return this.collectionsService.deleteCollection(user.id, id);
  }
}

