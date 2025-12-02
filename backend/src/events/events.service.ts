import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LimitsService } from '../limits/limits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private readonly limitsService: LimitsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAllEvents() {
    return this.prisma.event.findMany({
      include: { tickets: true, owner: true },
      orderBy: { date: 'asc' },
    });
  }

  async getMyEvents(userId: string) {
    return this.prisma.event.findMany({
      where: { ownerId: userId },
      orderBy: { date: 'desc' },
    });
  }

  async findByAuthor(authorId: string) {
    return this.prisma.event.findMany({
      where: { ownerId: authorId },
      include: { tickets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEvent(
    userId: string,
    dto: CreateEventDto,
  ) {
    await this.limitsService.ensureLimit(userId, 'create_event');

    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        coverImage: dto.coverImage,
        ticketUrl: dto.ticketUrl,
        price: dto.isFree ? 0 : (dto.price || 0),
        isFree: dto.isFree ?? true,
        location: dto.location,
        ownerId: userId,
      },
    });
  }

  async updateEvent(userId: string, id: string, data: { title?: string; description?: string; date?: string; coverImage?: string; price?: number; isFree?: boolean; location?: string }) {
    // Check if event exists and belongs to user
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this event');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date ? new Date(data.date) : undefined,
        coverImage: data.coverImage,
        price: data.isFree !== undefined ? (data.isFree ? 0 : (data.price || 0)) : undefined,
        isFree: data.isFree,
        location: data.location,
      },
    });
  }

  async deleteEvent(userId: string, id: string) {
    // Check if event exists and belongs to user
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { success: true };
  }

  async getEvent(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: { owner: true },
    });
  }

  async joinEvent(userId: string, eventId: string) {
    // Check if already joined
    const existing = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existing) {
      throw new ForbiddenException('Already joined this event');
    }

    // Get event with owner info
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { owner: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Get user info for notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, fullName: true, avatar: true },
    });

    // Create participant record and increment count
    await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId,
      },
    });

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: { participantCount: { increment: 1 } },
    });

    // Send notification to event owner (only if not joining own event)
    if (event.ownerId !== userId && user) {
      const userName = user.fullName || user.username;
      await this.notificationsService.createNotificationSync({
        userId: event.ownerId,
        type: 'event_join',
        fromUserId: userId,
        message: `${userName} "${event.title}" etkinliğinize katıldı.`,
        targetUrl: `/events/${eventId}`,
      });
    }

    return updatedEvent;
  }

  async getEventComments(id: string) {
    return this.prisma.eventComment.findMany({
      where: { eventId: id },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEventComment(userId: string, eventId: string, data: { text: string }) {
    // Get event with owner info
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { owner: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Get user info for notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, fullName: true, avatar: true },
    });

    // Create comment
    const comment = await this.prisma.eventComment.create({
      data: {
        text: data.text,
        eventId,
        authorId: userId,
      },
      include: { author: true },
    });

    // Send notification to event owner (only if not commenting on own event)
    if (event.ownerId !== userId && user) {
      const userName = user.fullName || user.username;
      await this.notificationsService.createNotificationSync({
        userId: event.ownerId,
        type: 'event_comment',
        fromUserId: userId,
        commentId: comment.id,
        message: `${userName} "${event.title}" etkinliğinize yorum yaptı.`,
        targetUrl: `/events/${eventId}`,
      });
    }

    return comment;
  }

  async getParticipants(eventId: string) {
    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return participants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      fullName: p.user.fullName,
      avatar: p.user.avatar,
    }));
  }
}

