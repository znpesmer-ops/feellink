import { Controller, Get, Put, Patch, Post, Delete, Body, Param, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateRoleSelectionDto } from './dto/update-role-selection.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getSelf(@CurrentUser() user: any) {
    // 🔥 KRİTİK: userId null/undefined kontrolü
    if (!user?.id) {
      throw new NotFoundException('Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.');
    }
    return this.usersService.getSelf(user.id);
  }

  @Get('profile/:username')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param('username') username: string, @CurrentUser() user: any) {
    // 🔥 KRİTİK: Username null/undefined kontrolü
    if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
      throw new NotFoundException('Geçersiz kullanıcı adı. Lütfen tekrar deneyin.');
    }
    
    // 🔥 KRİTİK: userId null/undefined kontrolü
    if (!user?.id) {
      throw new NotFoundException('Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.');
    }
    
    return this.usersService.getProfile(username, user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() data: UpdateUserDto
  ) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Query('q') query: string, @CurrentUser() user: any) {
    return this.usersService.searchUsers(query, user.id);
  }

  @Get('me/saved')
  @UseGuards(JwtAuthGuard)
  async getSavedPosts(@CurrentUser() user: any) {
    // This will be handled by posts service
    return { message: 'Use /posts/saved endpoint' };
  }

  @Get('highlights')
  @UseGuards(JwtAuthGuard)
  async getHighlights(@CurrentUser() user: any) {
    return this.usersService.getHighlights(user.id);
  }

  @Patch('me/roles')
  @UseGuards(JwtAuthGuard)
  async updateMyRoles(
    @CurrentUser() user: any,
    @Body() data: UpdateRoleSelectionDto,
  ) {
    return this.usersService.updateRoles(user.id, data);
  }

  @Patch('me/plan')
  @UseGuards(JwtAuthGuard)
  async updateMyPlan(
    @CurrentUser() user: any,
    @Body() data: { plan: 'FREE' | 'PRO' },
  ) {
    return this.usersService.updatePlan(user.id, data.plan);
  }

  @Get('me/capabilities')
  @UseGuards(JwtAuthGuard)
  async getMyCapabilities(@CurrentUser() user: any) {
    return this.usersService.getRoleCapabilities(user.id);
  }

  @Get('roles/overview')
  @UseGuards(JwtAuthGuard)
  async getRoleOverview() {
    return this.usersService.getRolesOverview();
  }

  @Post(':userId/block')
  @UseGuards(JwtAuthGuard)
  async blockUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    if (!user?.id) {
      throw new NotFoundException('Kullanıcı kimliği bulunamadı.');
    }
    return this.usersService.blockUser(user.id, userId);
  }

  @Delete(':userId/block')
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    if (!user?.id) {
      throw new NotFoundException('Kullanıcı kimliği bulunamadı.');
    }
    return this.usersService.unblockUser(user.id, userId);
  }

  @Get('me/blocked')
  @UseGuards(JwtAuthGuard)
  async getBlockedUsers(@CurrentUser() user: any) {
    if (!user?.id) {
      throw new NotFoundException('Kullanıcı kimliği bulunamadı.');
    }
    return this.usersService.getBlockedUsers(user.id);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser() user: any) {
    if (!user?.id) {
      throw new NotFoundException('Kullanıcı kimliği bulunamadı.');
    }
    return this.usersService.deleteAccount(user.id);
  }

  @Get(':id/saved-artworks')
  @UseGuards(JwtAuthGuard)
  async getSavedArtworks(@Param('id') userId: string, @CurrentUser() user: any) {
    // Only allow users to see their own saved artworks
    if (userId !== user.id) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    return this.usersService.getSavedArtworks(userId);
  }

  @Get(':id/saved')
  @UseGuards(JwtAuthGuard)
  async getSaved(@Param('id') userId: string, @CurrentUser() user: any) {
    // Only allow users to see their own saved items
    if (userId !== user.id) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    return this.usersService.getSaved(userId);
  }
}

