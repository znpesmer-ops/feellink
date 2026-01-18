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

  // ⚠️ ÖNEMLİ: Route sıralaması kritik!
  // 'conversations' route'u ':id' route'undan ÖNCE olmalı
  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser() user: any) {
    return this.chatService.getConversations(user.id);
  }

  // ':id' route'ları 'conversations' route'undan SONRA olmalı
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
    @Body() body: { participantIds: string[]; context?: 'DIRECT' | 'JOB_APPLICATION'; jobId?: string; applicationId?: string },
    @CurrentUser() user: any,
  ) {
    if (!user || !user.id) {
      throw new Error('Kullanıcı doğrulaması başarısız');
    }
    return this.chatService.createConversation(user.id, body.participantIds, body.context, body.jobId, body.applicationId);
  }

  @Put('conversations/:id/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error('Kullanıcı doğrulaması başarısız');
    }
    return this.chatService.markAsRead(id, user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  async deleteConversation(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error('Kullanıcı doğrulaması başarısız');
    }
    return this.chatService.deleteConversation(id, user.id);
  }

  @Put('messages/:id/edit')
  @ApiOperation({ summary: 'Edit a message' })
  async editMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentUser() user: any,
  ) {
    if (!user || !user.id) {
      throw new Error('Kullanıcı doğrulaması başarısız');
    }
    return this.chatService.editMessage(id, user.id, body.content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new Error('Kullanıcı doğrulaması başarısız');
    }
    return this.chatService.deleteMessage(id, user.id);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message (REST API fallback for Vercel)' })
  async createMessage(
    @Body() body: { conversationId: string; content?: string; imageUrl?: string; fileUrl?: string; fileName?: string; fileType?: string },
    @CurrentUser() user: any,
  ) {
    if (!user || !user.id) {
      throw new Error('Kullanıcı doğrulaması başarısız');
    }
    return this.chatService.createMessage(
      user.id,
      body.conversationId,
      body.content,
      body.imageUrl,
      body.fileUrl,
      body.fileName,
      body.fileType,
    );
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

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteklerini getir
  @Get('message-requests')
  @ApiOperation({ summary: 'Get message requests (Instagram style)' })
  async getMessageRequests(@CurrentUser() user: any) {
    return this.chatService.getMessageRequests(user.id);
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteğini kabul et
  @Put('message-requests/:id/accept')
  @ApiOperation({ summary: 'Accept a message request' })
  async acceptMessageRequest(@Param('id') conversationId: string, @CurrentUser() user: any) {
    return this.chatService.acceptMessageRequest(conversationId, user.id);
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteğini reddet
  @Put('message-requests/:id/decline')
  @ApiOperation({ summary: 'Decline a message request' })
  async declineMessageRequest(@Param('id') conversationId: string, @CurrentUser() user: any) {
    return this.chatService.declineMessageRequest(conversationId, user.id);
  }

  // 🔥 OKUNMAMIŞ MESAJ SAYISI (Bildirimler gibi)
  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.chatService.getUnreadMessageCount(user.id);
    return { count };
  }
}

