import { Controller, Get, Post, Body, Put, Delete, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}


  // 🔥 Tüm koleksiyonları getir (public - herkes görebilir)
  @Get('public')
  async getAllCollections() {
    return this.collectionsService.getAllCollections();
  }

  @Get('my')
  async getMyCollections(@CurrentUser() user: any) {
    return this.collectionsService.getMyCollections(user.id);
  }

  // ⚠️ ÖNEMLİ: Bu route en son olmalı, çünkü :id her şeyi yakalar
  @Get(':id')
  async getCollectionById(@Param('id') id: string) {
    return this.collectionsService.getCollectionById(id);
  }

  @Get(':id/search-addable')
  async searchAddableItems(
    @CurrentUser() user: any,
    @Param('id') collectionId: string,
    @Query('q') query?: string,
    @Query('ownerId') ownerId?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.collectionsService.searchAddableItems(
      user.id,
      collectionId,
      query || '',
      ownerId,
      cursor,
      take ? parseInt(take, 10) : 20,
    );
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

  @Post(':id/items')
  async addItemToCollection(
    @CurrentUser() user: any,
    @Param('id') collectionId: string,
    @Body() data: { postId: string },
  ) {
    return this.collectionsService.addItemToCollection(user.id, collectionId, data.postId);
  }

  @Delete(':id/items/:itemId')
  async removeItemFromCollection(
    @CurrentUser() user: any,
    @Param('id') collectionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.collectionsService.removeItemFromCollection(user.id, collectionId, itemId);
  }

  @Patch(':id/items/reorder')
  async reorderItems(
    @CurrentUser() user: any,
    @Param('id') collectionId: string,
    @Body() data: { itemIds: string[] },
  ) {
    return this.collectionsService.reorderItems(user.id, collectionId, data.itemIds);
  }
}

