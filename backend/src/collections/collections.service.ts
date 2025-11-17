import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeCapabilities } from '../roles/roles.utils';
import { SubscriptionPlanCode } from '../roles/roles.types';
import { LimitsService } from '../limits/limits.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService, private limitsService: LimitsService) {}

  private async ensurePermission(userId: string, requireManage = false) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        plan: true,
        badges: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = (user.roles as string[]) ?? [];
    const plan = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const badges = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const capabilities = computeCapabilities(roles, plan, badges);

    const hasAccess = requireManage
      ? capabilities.permissions.canManageCollections
      : capabilities.permissions.canAccessCollections;

    if (!hasAccess) {
      throw new ForbiddenException('Bu işlem için Koleksiyoner yetkisine sahip olmalısınız.');
    }
  }

  async getMyCollections(userId: string) {
    await this.ensurePermission(userId, false);
    return this.prisma.collection.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔥 Tüm koleksiyonları getir (public)
  async getAllCollections() {
    return this.prisma.collection.findMany({
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            roles: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCollection(userId: string, data: { title: string; description?: string; coverImage?: string }) {
    await this.ensurePermission(userId, true);
    await this.limitsService.ensureLimit(userId, 'create_collection');
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
    await this.ensurePermission(userId, true);
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
    await this.ensurePermission(userId, true);
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

