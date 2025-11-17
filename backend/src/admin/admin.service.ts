import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { getPrismaInstance } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private prisma = getPrismaInstance();

  async getSummary() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      totalUsers,
      newUsers24h,
      postsToday,
      commentsToday,
      ticketsToday,
      revenuePurchases,
      totalPosts,
      totalComments,
      totalEvents,
      totalTickets,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: yesterdayStart } },
      }),
      this.prisma.post.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.comment.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.ticketPurchase.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.ticketPurchase.findMany({
        where: { createdAt: { gte: todayStart } },
        include: {
          ticket: {
            select: {
              price: true,
            },
          },
        },
      }),
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.event.count(),
      this.prisma.ticketPurchase.count(),
    ]);

    // Online users (isOnline = true)
    const onlineUsers = await this.prisma.user.count({
      where: { isOnline: true },
    });

    // Revenue calculation
    const revenue = revenuePurchases.reduce(
      (sum, purchase) => sum + (purchase.ticket.price || 0),
      0,
    );

    // Last 30 days traffic data (simplified - count users per day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all users created in last 30 days
    const recentUsers = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const dailyStatsMap = new Map<string, number>();
    recentUsers.forEach((user) => {
      const dateKey = new Date(user.createdAt).toISOString().split('T')[0];
      dailyStatsMap.set(dateKey, (dailyStatsMap.get(dateKey) || 0) + 1);
    });

    const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, count]) => ({
      date: new Date(date),
      count,
    }));

    return {
      totalUsers,
      newUsers24h,
      onlineUsers,
      postsToday,
      commentsToday,
      ticketsToday,
      revenue,
      totalPosts,
      totalComments,
      totalEvents,
      totalTickets,
      traffic30d: dailyStats.map((stat) => ({
        date: stat.date,
        count: stat.count,
      })),
    };
  }

  async getUsers(page = 1, limit = 20, search?: string, role?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.roles = { has: role };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          avatar: true,
          roles: true,
          plan: true,
          badges: true,
          isVerified: true,
          isAdmin: true,
          isPrivate: true,
          followerCount: true,
          followingCount: true,
          isOnline: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async updateUser(
    userId: string,
    data: {
      roles?: string[];
      isVerified?: boolean;
      isAdmin?: boolean;
    },
    actorId: string,
  ) {
    const { roles: incomingRoles, ...rest } = data;

    const normalizedRoles = incomingRoles
      ? Array.from(
          new Set(
            incomingRoles
              .map((role) => role?.trim())
              .filter(
                (role): role is UserRole =>
                  !!role && Object.values(UserRole).includes(role as UserRole),
              ),
          ),
        )
      : undefined;

    const updatePayload: Prisma.UserUpdateInput = {
      ...rest,
    };

    if (normalizedRoles) {
      updatePayload.roles = { set: normalizedRoles };
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updatePayload,
    });

    // Audit log
    await this.createAuditLog({
      actorId,
      action: 'user.update',
      target: `user:${userId}`,
      meta: {
        changes: {
          ...rest,
          ...(normalizedRoles ? { roles: normalizedRoles } : {}),
        },
      },
    });

    return user;
  }

  async getPosts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count(),
    ]);

    return { posts, total, page, limit };
  }

  async deletePost(postId: string, actorId: string) {
    await this.prisma.post.delete({
      where: { id: postId },
    });

    await this.createAuditLog({
      actorId,
      action: 'post.delete',
      target: `post:${postId}`,
    });

    return { success: true };
  }

  async getComments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          post: {
            select: {
              id: true,
              caption: true,
            },
          },
        },
      }),
      this.prisma.comment.count(),
    ]);

    return { comments, total, page, limit };
  }

  async deleteComment(commentId: string, actorId: string) {
    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    await this.createAuditLog({
      actorId,
      action: 'comment.delete',
      target: `comment:${commentId}`,
    });

    return { success: true };
  }

  async getArticles(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.article.count(),
    ]);

    return { articles, total, page, limit };
  }

  async deleteArticle(articleId: string, actorId: string) {
    await this.prisma.article.delete({
      where: { id: articleId },
    });

    await this.createAuditLog({
      actorId,
      action: 'article.delete',
      target: `article:${articleId}`,
    });

    return { success: true };
  }

  async getEvents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              participants: true,
              tickets: true,
            },
          },
        },
      }),
      this.prisma.event.count(),
    ]);

    return { events, total, page, limit };
  }

  async getTickets(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      this.prisma.ticketPurchase.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          ticket: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.ticketPurchase.count(),
    ]);

    return { tickets, total, page, limit };
  }

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateFeatureFlag(key: string, enabled: boolean, updatedBy: string) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, updatedBy },
      create: { key, enabled, updatedBy },
    });

    await this.createAuditLog({
      actorId: updatedBy,
      action: 'feature_flag.update',
      target: `flag:${key}`,
      meta: { enabled },
    });

    return flag;
  }

  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return { logs, total, page, limit };
  }

  async createAuditLog(data: {
    actorId: string;
    action: string;
    target?: string;
    meta?: any;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }

  async getModerationItems() {
    // For now, return empty array since Report model doesn't exist yet
    // This can be extended when Report model is added
    return {
      items: [],
      total: 0,
    };
  }

  async getAnalytics() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers24h,
      newUsers24h,
      postsToday,
      commentsToday,
      ticketsToday,
      revenuePurchases,
      totalPosts,
      totalComments,
      totalEvents,
      totalTickets,
      allRevenuePurchases,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          OR: [
            { isOnline: true },
            { lastSeen: { gte: yesterdayStart } },
          ],
        },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: yesterdayStart } },
      }),
      this.prisma.post.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.comment.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.ticketPurchase.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.ticketPurchase.findMany({
        where: { createdAt: { gte: todayStart } },
        include: {
          ticket: {
            select: {
              price: true,
            },
          },
        },
      }),
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.event.count(),
      this.prisma.ticketPurchase.count(),
      this.prisma.ticketPurchase.findMany({
        include: {
          ticket: {
            select: {
              price: true,
            },
          },
        },
      }),
    ]);

    // Revenue calculations
    const revenue = revenuePurchases.reduce(
      (sum, purchase) => sum + (purchase.ticket.price || 0),
      0,
    );
    const totalRevenue = allRevenuePurchases.reduce(
      (sum, purchase) => sum + (purchase.ticket.price || 0),
      0,
    );

    // Get last 30 days data for trends
    const engagementTrend = [];
    const growthTrend = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [posts, comments, users] = await Promise.all([
        this.prisma.post.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.comment.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      engagementTrend.push({
        date: date.toISOString().split('T')[0],
        posts,
        comments,
      });

      growthTrend.push({
        date: date.toISOString().split('T')[0],
        users,
      });
    }

    // Top countries (dummy data for now - can be extended when country field is added)
    // For now, we'll return a placeholder structure
    const topCountries = [
      { country: 'Türkiye', count: Math.floor(totalUsers * 0.75) },
      { country: 'Almanya', count: Math.floor(totalUsers * 0.1) },
      { country: 'Fransa', count: Math.floor(totalUsers * 0.05) },
      { country: 'İngiltere', count: Math.floor(totalUsers * 0.04) },
      { country: 'Diğer', count: totalUsers - Math.floor(totalUsers * 0.94) },
    ].filter((item) => item.count > 0);

    return {
      totalUsers,
      activeUsers: activeUsers24h,
      totalPosts,
      totalComments,
      totalTickets,
      totalRevenue,
      topCountries,
      engagementTrend,
      growthTrend,
    };
  }
}

