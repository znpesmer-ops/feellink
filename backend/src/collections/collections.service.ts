import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async getMyCollections(userId: string) {
    return this.prisma.collection.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCollection(userId: string, data: { title: string; description?: string; coverImage?: string }) {
    return this.prisma.collection.create({
      data: {
        title: data.title,
        description: data.description,
        coverImage: data.coverImage,
        ownerId: userId,
      },
    });
  }

  async updateCollection(userId: string, id: string, data: { title?: string; description?: string; coverImage?: string }) {
    // Check if collection exists and belongs to user
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this collection');
    }

    return this.prisma.collection.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        coverImage: data.coverImage,
      },
    });
  }

  async deleteCollection(userId: string, id: string) {
    // Check if collection exists and belongs to user
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this collection');
    }

    await this.prisma.collection.delete({
      where: { id },
    });

    return { success: true };
  }
}

