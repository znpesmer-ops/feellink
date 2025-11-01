import { Controller, Get, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile/:username')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param('username') username: string, @CurrentUser() user: any) {
    return this.usersService.getProfile(username, user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() data: { fullName?: string; bio?: string; avatar?: string; isPrivate?: boolean }
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
}

