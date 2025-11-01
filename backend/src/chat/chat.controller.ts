import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.getConversation(id, user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages from a conversation' })
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit: string = '50',
    @Query('cursor') cursor?: string,
    @CurrentUser() user?: any,
  ) {
    return this.chatService.getMessages(id, user.id, parseInt(limit), cursor);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  async createConversation(
    @Body() body: { participantIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.chatService.createConversation(user.id, body.participantIds);
  }

  @Put('conversations/:id/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.markAsRead(id, user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  async deleteConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.deleteConversation(id, user.id);
  }

  @Put('messages/:id/edit')
  @ApiOperation({ summary: 'Edit a message' })
  async editMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentUser() user: any,
  ) {
    return this.chatService.editMessage(id, user.id, body.content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.deleteMessage(id, user.id);
  }

  @Get('conversations/:id/media')
  @ApiOperation({ summary: 'Get media (images) from a conversation' })
  async getMedia(@Param('id') conversationId: string, @CurrentUser() user: any) {
    return this.chatService.getMedia(conversationId, user.id);
  }

  @Get('conversations/:id/files')
  @ApiOperation({ summary: 'Get files from a conversation' })
  async getFiles(@Param('id') conversationId: string, @CurrentUser() user: any) {
    return this.chatService.getFiles(conversationId, user.id);
  }
}

