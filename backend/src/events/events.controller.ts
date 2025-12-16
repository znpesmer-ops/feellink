import { Controller, Get, Post, Body, Put, Delete, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get('all')
  async getAllEvents() {
    return this.eventsService.getAllEvents();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyEvents(@CurrentUser() user: any) {
    return this.eventsService.getMyEvents(user.id);
  }

  @Get()
  async getEvents(@Query('authorId') authorId?: string) {
    if (authorId) {
      return this.eventsService.findByAuthor(authorId);
    }
    return this.eventsService.getAllEvents();
  }

  @Get(':id')
  async getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createEvent(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(user.id, dto);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinEvent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.joinEvent(user.id, id);
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') id: string) {
    return this.eventsService.getParticipants(id);
  }

  @Get(':id/comments')
  async getEventComments(@Param('id') id: string) {
    return this.eventsService.getEventComments(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createEventComment(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.eventsService.createEventComment(user.id, id, data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateEvent(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.eventsService.updateEvent(user.id, id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteEvent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.deleteEvent(user.id, id);
  }

  @Get(':id/requests')
  @UseGuards(JwtAuthGuard)
  async getPendingRequests(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventsService.getPendingRequests(id, user.id);
  }

  @Patch(':id/requests/:userId')
  @UseGuards(JwtAuthGuard)
  async updateRequestStatus(
    @CurrentUser() user: any,
    @Param('id') eventId: string,
    @Param('userId') requestUserId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' },
  ) {
    return this.eventsService.updateRequestStatus(eventId, requestUserId, user.id, body.status);
  }
}

