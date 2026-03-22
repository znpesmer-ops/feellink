import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LimitsService } from '../limits/limits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private readonly limitsService: LimitsService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  /** API: onaylı sayı + kontenjan üst sınırı (null = sınırsız) */
  private mapEventForApi<T extends Record<string, unknown>>(event: T): T & {
    approvedParticipantsCount: number;
    capacity: number | null;
  } {
    const count = typeof event.participantCount === 'number' ? event.participantCount : 0;
    const cap =
      event.maxParticipants !== undefined && event.maxParticipants !== null
        ? (event.maxParticipants as number)
        : null;
    return {
      ...event,
      approvedParticipantsCount: count,
      capacity: cap,
    };
  }

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

      return events.map((e) => this.mapEventForApi(e as Record<string, unknown>));
    } catch (error) {
      console.error('Error fetching events:', error);
      // Hata durumunda boş array döndür, 500 hatası verme
      return [];
    }
  }

  async getMyEvents(userId: string) {
    const list = await this.prisma.event.findMany({
      where: { ownerId: userId, isDeleted: false },
      orderBy: { date: 'desc' },
    });
    return list.map((e) => this.mapEventForApi(e as Record<string, unknown>));
  }

  async findByAuthor(authorId: string) {
    const list = await this.prisma.event.findMany({
      where: { ownerId: authorId, isDeleted: false },
      include: { tickets: true },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((e) => this.mapEventForApi(e as Record<string, unknown>));
  }

  async createEvent(
    userId: string,
    dto: CreateEventDto,
  ) {
    await this.limitsService.ensureCanCreateEvent(userId);

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
        ...(dto.maxParticipants != null && dto.maxParticipants >= 1
          ? { maxParticipants: dto.maxParticipants }
          : {}),
      },
    });
  }

  async updateEvent(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      date?: string;
      coverImage?: string;
      price?: number;
      isFree?: boolean;
      location?: string;
      maxParticipants?: number | null;
    },
  ) {
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
        ...(data.maxParticipants !== undefined
          ? {
              maxParticipants:
                data.maxParticipants === null || data.maxParticipants === undefined
                  ? null
                  : data.maxParticipants >= 1
                    ? data.maxParticipants
                    : null,
            }
          : {}),
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

  async getEvent(id: string, viewerId?: string) {
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

    // KVKK: Kimlerin katıldığı sadece sahibe; herkese onaylı sayı + kontenjan (kimliksiz özet)
    const mapped = this.mapEventForApi({ ...event } as Record<string, unknown>);
    const isOwner = viewerId && event.ownerId === viewerId;
    if (!isOwner && viewerId) {
      const viewerParticipation = event.participants.find((p) => p.userId === viewerId);
      return {
        ...mapped,
        participants: viewerParticipation ? [viewerParticipation] : [],
      };
    }
    if (!isOwner && !viewerId) {
      return {
        ...mapped,
        participants: [],
      };
    }

    return mapped;
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

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        ownerId: true,
        isDeleted: true,
        participantCount: true,
        maxParticipants: true,
        owner: true,
      },
    });

    if (!event || event.isDeleted) {
      throw new NotFoundException('Event not found');
    }

    if (
      event.maxParticipants != null &&
      event.participantCount >= event.maxParticipants
    ) {
      throw new ForbiddenException('Bu etkinliğin kontenjanı dolmuştur.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, fullName: true, avatar: true },
    });

    await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId,
        status: 'PENDING',
      },
    });

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

    const after = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    return after
      ? this.mapEventForApi(after as Record<string, unknown>)
      : null;
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

  async getParticipants(eventId: string, callerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { ownerId: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.ownerId !== callerId) {
      throw new ForbiddenException('Sadece etkinlik düzenleyicisi katılımcı listesini görebilir.');
    }

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId, status: 'APPROVED' },
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
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        ownerId: true,
        title: true,
        participantCount: true,
        maxParticipants: true,
        isFree: true,
        price: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to update requests for this event');
    }

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

    if (status === 'APPROVED') {
      if (
        event.maxParticipants != null &&
        event.participantCount >= event.maxParticipants
      ) {
        throw new ForbiddenException(
          'Kontenjan dolduğu için onay verilemiyor.',
        );
      }
    }

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

    if (status === 'APPROVED') {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { participantCount: { increment: 1 } },
      });

      await this.notificationsService.createNotificationSync({
        userId: requestUserId,
        type: 'event_request_approved',
        fromUserId: ownerId,
        message: `"${event.title}" etkinliğine yaptığınız talep onaylandı.`,
        targetUrl: `/events/${eventId}`,
      });

      const requester = await this.prisma.user.findUnique({
        where: { id: requestUserId },
        select: { email: true },
      });
      if (requester?.email) {
        const isPaid = !event.isFree && (event.price ?? 0) > 0;
        await this.mailService.sendEventRequestApprovedEmail(requester.email, {
          eventTitle: event.title,
          isPaid,
        });
      }
    }

    return updated;
  }
}

