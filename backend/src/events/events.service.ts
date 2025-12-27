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
    try {
      // 🔒 GÜVENLİ GEVŞETME - Eski event'ler kaybolmasın
      // Sadece silinmemiş eventleri getir, diğer filtreleri kaldır
      const events = await this.prisma.event.findMany({
        where: { 
          isDeleted: false,
          // approved, isPublic, status gibi katı filtreler kaldırıldı
          // Böylece eski kayıtlar da görünür
        },
        include: { 
          tickets: true, 
          owner: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
            },
          },
          participants: {
            select: {
              userId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' }, // En yeni önce
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      // Hata durumunda boş array döndür, 500 hatası verme
      return [];
    }
  }

  async getMyEvents(userId: string) {
    return this.prisma.event.findMany({
      where: { ownerId: userId, isDeleted: false },
      orderBy: { date: 'desc' },
    });
  }

  async findByAuthor(authorId: string) {
    return this.prisma.event.findMany({
      where: { ownerId: authorId, isDeleted: false },
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

    // Soft delete: mark as deleted instead of hard delete
    await this.prisma.event.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { 
        owner: true,
        participants: {
          select: {
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!event || event.isDeleted) {
      throw new NotFoundException('Event not found');
    }

    return event;
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

    // Create participant record with PENDING status (do not increment count yet)
    await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId,
        status: 'PENDING',
      },
    });

    // Send notification to event owner about new request (only if not joining own event)
    if (event.ownerId !== userId && user) {
      const userName = user.fullName || user.username;
      await this.notificationsService.createNotificationSync({
        userId: event.ownerId,
        type: 'event_request',
        fromUserId: userId,
        message: `${userName} "${event.title}" etkinliğinize katılım talebi gönderdi.`,
        targetUrl: `/events/${eventId}`,
      });
    }

    // Return event without incrementing count (count will increment when approved)
    return this.prisma.event.findUnique({
      where: { id: eventId },
    });
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

  async getPendingRequests(eventId: string, ownerId: string) {
    // Check if user is the owner
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { ownerId: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to view requests for this event');
    }

    // Get PENDING requests
    const requests = await this.prisma.eventParticipant.findMany({
      where: { 
        eventId,
        status: 'PENDING',
      },
      include: { 
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        username: r.user.username,
        fullName: r.user.fullName,
        avatar: r.user.avatar,
      },
    }));
  }

  async updateRequestStatus(
    eventId: string,
    requestUserId: string,
    ownerId: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    // Check if user is the owner
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { ownerId: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to update requests for this event');
    }

    // Find the request
    const request = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: requestUserId,
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ForbiddenException('Request status cannot be changed');
    }

    // Update request status
    const updated = await this.prisma.eventParticipant.update({
      where: {
        eventId_userId: {
          eventId,
          userId: requestUserId,
        },
      },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });

    // If approved, increment participant count
    if (status === 'APPROVED') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { participantCount: { increment: 1 } },
      });

      // Send notification to requester
      const eventData = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { title: true },
      });

      if (eventData) {
        await this.notificationsService.createNotificationSync({
          userId: requestUserId,
          type: 'event_request_approved',
          fromUserId: ownerId,
          message: `"${eventData.title}" etkinliğine yaptığınız talep onaylandı.`,
          targetUrl: `/events/${eventId}`,
        });
      }
    }

    return updated;
  }
}

