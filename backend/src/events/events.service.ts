import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

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

  async createEvent(userId: string, data: { title: string; description?: string; date: string; coverImage?: string; ticketUrl?: string }) {
    // Check if user is corporate
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    
    if (user?.role !== 'CORPORATE') {
      throw new ForbiddenException('Only corporate users can create events');
    }
    
    return this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        coverImage: data.coverImage,
        ticketUrl: data.ticketUrl,
        ownerId: userId,
      },
    });
  }

  async updateEvent(userId: string, id: string, data: { title?: string; description?: string; date?: string; coverImage?: string }) {
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

    // Create participant record and increment count
    await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId,
      },
    });

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: { participantCount: { increment: 1 } },
    });

    return event;
  }

  async getEventComments(id: string) {
    return this.prisma.eventComment.findMany({
      where: { eventId: id },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEventComment(userId: string, eventId: string, data: { text: string }) {
    return this.prisma.eventComment.create({
      data: {
        text: data.text,
        eventId,
        authorId: userId,
      },
      include: { author: true },
    });
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

