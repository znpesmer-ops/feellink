import {
  Controller,
  Post,
  Delete,
  Get,
  UseGuards,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private blocksService: BlocksService) {}

  @Post(':userId')
  async blockUser(
    @Param('userId') blockedId: string,
    @CurrentUser() user: any,
  ) {
    return this.blocksService.blockUser(user.id, blockedId);
  }

  @Delete(':userId')
  async unblockUser(@Param('userId') blockedId: string, @CurrentUser() user: any) {
    return this.blocksService.unblockUser(user.id, blockedId);
  }

  @Get('check/:userId')
  async checkBlockStatus(@Param('userId') blockedId: string, @CurrentUser() user: any) {
    try {
      return await this.blocksService.checkBlockStatus(user.id, blockedId);
    } catch (error: any) {
      console.error('Error in checkBlockStatus controller:', error);
      // Hata durumunda engellenmemiş olarak dön
      return {
        isBlocked: false,
        block: null,
      };
    }
  }

  @Get('list')
  async getBlockedUsers(@CurrentUser() user: any) {
    return this.blocksService.getBlockedUsers(user.id);
  }
}

