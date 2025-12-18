import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private followService: FollowService) {}

  // Spesifik route'ları önce tanımla (NestJS route sıralaması önemli)
  @Post('request/:userId/accept')
  async acceptRequest(@Param('userId') userId: string, @CurrentUser() user: any) {
    // userId is the requester, user.id is the requested (who accepts)
    return this.followService.acceptFollowRequest(user.id, userId);
  }

  @Post('request/:userId/reject')
  async rejectRequest(@Param('userId') userId: string, @CurrentUser() user: any) {
    // userId is the requester, user.id is the requested (who rejects)
    return this.followService.rejectFollowRequest(user.id, userId);
  }

  @Post('request/:userId/cancel')
  async cancelRequest(@Param('userId') userId: string, @CurrentUser() user: any) {
    // userId is the target (receiver), user.id is the requester (who cancels)
    return this.followService.cancelFollowRequest(user.id, userId);
  }

  @Post('block/:userId')
  async blockUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.followService.blockUser(user.id, userId);
  }

  @Delete('block/:userId')
  async unblockUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.followService.unblockUser(user.id, userId);
  }

  @Get('requests')
  async getFollowRequests(@CurrentUser() user: any) {
    return this.followService.getFollowRequests(user.id);
  }

  // Mevcut kullanıcının takipçilerini getir (shortcut endpoint)
  @Get('followers')
  async getMyFollowers(@CurrentUser() user: any) {
    return this.followService.getFollowers(user.id, user.id);
  }

  // Mevcut kullanıcının takip ettiklerini getir (shortcut endpoint)
  @Get('following')
  async getMyFollowing(@CurrentUser() user: any) {
    return this.followService.getFollowing(user.id, user.id);
  }

  // Belirli bir kullanıcının takipçilerini getir
  @Get(':userId/followers')
  async getFollowers(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.followService.getFollowers(userId, user.id);
  }

  // Belirli bir kullanıcının takip ettiklerini getir
  @Get(':userId/following')
  async getFollowing(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.followService.getFollowing(userId, user.id);
  }

  // Remove follower endpoint (Instagram-style: remove someone who follows you)
  @Delete('remove-follower/:userId')
  async removeFollower(@Param('userId') userId: string, @CurrentUser() user: any) {
    // userId = the follower to be removed
    // user.id = the profile owner (who removes the follower)
    return this.followService.removeFollower(user.id, userId);
  }

  // Genel route'ları en sona koy (spesifik olanlardan sonra)
  @Post(':userId')
  async followUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.followService.followUser(user.id, userId);
  }

  @Delete(':userId')
  async unfollowUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.followService.unfollowUser(user.id, userId);
  }
}


