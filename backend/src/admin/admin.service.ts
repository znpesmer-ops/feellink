import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ColorAnalysisService } from '../posts/color-analysis.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ColorAnalysisService))
    private colorAnalysisService: ColorAnalysisService,
    private mailService: MailService,
  ) {}

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

  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
    city?: string,
    gender?: string,
    ageMin?: number,
    ageMax?: number,
  ) {
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

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (gender) {
      where.gender = gender;
    }

    // Age range filter (calculate from dateOfBirth)
    if (ageMin !== undefined || ageMax !== undefined) {
      const today = new Date();
      where.dateOfBirth = {};
      
      if (ageMax !== undefined) {
        // Minimum birth date (oldest age)
        const minBirthDate = new Date(today.getFullYear() - ageMax - 1, today.getMonth(), today.getDate());
        where.dateOfBirth.lte = minBirthDate;
      }
      
      if (ageMin !== undefined) {
        // Maximum birth date (youngest age)
        const maxBirthDate = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
        where.dateOfBirth.gte = maxBirthDate;
      }
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
          dateOfBirth: true,
          country: true,
          city: true,
          gender: true,
          profileCompleted: true,
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
    // Eski kullanıcı bilgilerini al (rol değişikliği kontrolü için)
    const oldUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        roles: true,
      },
    });

    if (!oldUser) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

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

    // ✅ 30 GÜN KONTROLÜ (Sadece rol değişikliği için)
    if (normalizedRoles && normalizedRoles.length > 0) {
      const oldRolesSorted = [...(oldUser.roles || [])].sort().join(',');
      const newRolesSorted = [...normalizedRoles].sort().join(',');
      
      // Rol değişmişse 30 gün kontrolü yap
      if (oldRolesSorted !== newRolesSorted) {
        const lastChange = await this.prisma.roleChangeLog.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (lastChange) {
          const diffInDays =
            (Date.now() - lastChange.createdAt.getTime()) / (1000 * 60 * 60 * 24);

          if (diffInDays < 30) {
            const remainingDays = Math.ceil(30 - diffInDays);
            throw new BadRequestException(
              `Bu kullanıcının rolü ${remainingDays} gün sonra tekrar değiştirilebilir.`,
            );
          }
        }
      }
    }

    if (normalizedRoles) {
      updatePayload.roles = { set: normalizedRoles };
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        roles: true,
      },
    });

    // ✅ Rol değişikliği kontrolü, log ve mail gönderimi
    if (normalizedRoles && normalizedRoles.length > 0) {
      const oldRolesSorted = [...(oldUser.roles || [])].sort().join(',');
      const newRolesSorted = [...normalizedRoles].sort().join(',');
      
      // Rol değişmişse log kaydet, mail gönder ve refresh token'ları invalidate et
      if (oldRolesSorted !== newRolesSorted) {
        // ✅ RoleChangeLog kaydı oluştur
        await this.prisma.roleChangeLog.create({
          data: {
            userId,
            changedBy: actorId,
            oldRoles: (oldUser.roles || []) as string[],
            newRoles: normalizedRoles as string[],
          },
        });

        // ✅ Mail gönder (süre bilgisi ile)
        const nextChangeDate = new Date();
        nextChangeDate.setDate(nextChangeDate.getDate() + 30);
        
        this.mailService.sendRoleChangedMail({
          to: user.email,
          name: user.fullName || user.username,
          oldRoles: oldUser.roles || [],
          newRoles: normalizedRoles,
          nextChangeDate: nextChangeDate,
        }).catch((error) => {
          console.error('Failed to send role changed email:', error);
        });

        // Session invalidate: Kullanıcının tüm refresh token'larını sil
        try {
          await this.prisma.refreshToken.deleteMany({
            where: { userId: userId },
          });
        } catch (error) {
          console.error('Failed to invalidate refresh tokens:', error);
          // Hata durumunda işlemi engelleme
        }
      }
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'user.update',
        target: `user:${userId}`,
        meta: {
          changes: data,
        },
      },
    });

    return user;
  }

  // ✅ Rol geçmişi endpoint'i
  async getRoleHistory(userId: string) {
    const logs = await this.prisma.roleChangeLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Son 50 değişiklik
      include: {
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
    });

    // ChangedBy bilgisini almak için admin kullanıcıları çek
    const changedByIds = [...new Set(logs.map(log => log.changedBy))] as string[];
    const changers = await this.prisma.user.findMany({
      where: { id: { in: changedByIds } },
      select: {
        id: true,
        username: true,
        fullName: true,
      },
    });

    const changersMap = new Map(changers.map(c => [c.id, c.fullName || c.username]));

    return logs.map(log => ({
      id: log.id,
      oldRoles: log.oldRoles as UserRole[],
      newRoles: log.newRoles as UserRole[],
      changedBy: changersMap.get(log.changedBy) || 'Bilinmeyen',
      createdAt: log.createdAt,
    }));
  }

  // ✅ Kalan gün bilgisi (30 gün kontrolü için)
  async getRoleChangeRemainingDays(userId: string): Promise<number | null> {
    const lastChange = await this.prisma.roleChangeLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastChange) {
      return null; // Hiç değişiklik yoksa null döndür
    }

    const diffInDays =
      (Date.now() - lastChange.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (diffInDays >= 30) {
      return 0; // 30 gün geçmiş, değişiklik yapılabilir
    }

    return Math.ceil(30 - diffInDays);
  }

  async deleteUser(userId: string, actorId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, superAdmin: true },
    });

    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Prevent deleting superAdmin (GOD-MODE protection)
    if (user.superAdmin) {
      throw new Error('SuperAdmin kullanıcılar silinemez');
    }

    // Prevent self-deletion
    if (user.id === actorId) {
      throw new Error('Kendi hesabınızı silemezsiniz');
    }

    // Delete user (Prisma cascade will handle related records)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'user.delete',
        target: `user:${userId}`,
        meta: {
          deletedUser: {
            username: user.username,
            email: user.email,
          },
        },
      },
    });

    return { message: 'Kullanıcı başarıyla silindi', deletedUserId: userId };
  }

  async getPosts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: limit,
        where: {
          type: 'post', // Sadece normal gönderiler
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              url: true,
              thumbnailUrl: true,
              order: true,
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
      this.prisma.post.count({
        where: {
          type: 'post',
        },
      }),
    ]);

    return { posts, total, page, limit };
  }

  // ✅ Eserler (Artworks) yönetimi
  async getArtworks(page = 1, limit = 20, search?: string, userId?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {
      type: 'artwork', // Sadece eserler
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caption: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (userId) {
      where.userId = userId;
    }

    const [artworks, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              fullName: true,
            },
          },
          media: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              url: true,
              thumbnailUrl: true,
              order: true,
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
      this.prisma.post.count({ where }),
    ]);

    return { artworks, total, page, limit };
  }

  async deleteArtwork(artworkId: string, actorId: string) {
    const artwork = await this.prisma.post.findUnique({
      where: { id: artworkId },
      select: { id: true, type: true, title: true },
    });

    if (!artwork) {
      throw new NotFoundException('Eser bulunamadı');
    }

    if (artwork.type !== 'artwork') {
      throw new BadRequestException('Bu bir eser değil');
    }

    await this.prisma.post.delete({
      where: { id: artworkId },
    });

    await this.createAuditLog({
      actorId,
      action: 'artwork.delete',
      target: `artwork:${artworkId}`,
      meta: {
        artworkTitle: artwork.title,
      },
    });

    return { message: 'Eser başarıyla silindi', deletedArtworkId: artworkId };
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

  // 🎨 Tüm gönderiler için renk analizi yeniden hesaplama
  async recalculateColors() {
    try {
      // Tüm gönderileri medya bilgileriyle birlikte al
      const posts = await this.prisma.post.findMany({
        where: {
          media: {
            some: {
              type: 'image', // Sadece görseller için renk analizi
            },
          },
        },
        include: {
          media: {
            where: {
              type: 'image',
            },
            orderBy: {
              order: 'asc',
            },
            take: 1, // Her post için ilk görsel
          },
        },
      });

      let processed = 0;
      let failed = 0;
      const results = [];

      for (const post of posts) {
        if (post.media.length === 0) {
          continue;
        }

        const firstImage = post.media[0];
        if (!firstImage || !firstImage.url) {
          continue;
        }

        try {
          // Renk analizi yap
          const colors = await this.colorAnalysisService.extractColors(firstImage.url);

          if (colors.length > 0) {
            // Post'u güncelle
            await this.prisma.post.update({
              where: { id: post.id },
              data: {
                colorPalette: colors,
              },
            });

            processed++;
            results.push({
              postId: post.id,
              status: 'success',
              colors: colors.length,
            });
          } else {
            // Renk bulunamadı
            failed++;
            results.push({
              postId: post.id,
              status: 'no_colors',
            });
          }
        } catch (error) {
          failed++;
          results.push({
            postId: post.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        message: '✅ Renk analizi yeniden hesaplama tamamlandı.',
        totalPosts: posts.length,
        processed,
        failed,
        results: results.slice(0, 10), // İlk 10 sonucu göster
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Renk analizi yeniden hesaplama hatası: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Settings management - Gerçek database write
  async updateSetting(key: string, value: string, updatedBy?: string) {
    try {
      // 🔒 Validasyon: Boş değer gitmesin
      if (!value || !value.trim()) {
        throw new BadRequestException(`${key} boş olamaz`);
      }

      // 🔒 KRİTİK: await + upsert ile gerçek database write
      // @ts-ignore - Prisma client generated, setting model exists
      const updated = await this.prisma.setting.upsert({
        where: { key },
        update: {
          value: value.trim(),
          updatedBy: updatedBy || null,
        },
        create: {
          key,
          value: value.trim(),
          updatedBy: updatedBy || null,
        },
      });

      // ✅ Kesin commit oldu - return ediyoruz
      return {
        success: true,
        key: updated.key,
        value: updated.value,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Ayar güncellenemedi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSettings() {
    try {
      // 🔒 Database'den gerçek değerleri çek
      // @ts-ignore - Prisma client generated, setting model exists
      const settings = await this.prisma.setting.findMany({
        where: {
          key: {
            in: ['siteName', 'siteDescription', 'adminEmail'],
          },
        },
      });

      // Key-value map oluştur
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      // Default değerlerle merge et (database'de yoksa)
      return {
        siteName: settingsMap.siteName || 'Feellink',
        siteDescription: settingsMap.siteDescription || 'Modern sosyal medya platformu',
        adminEmail: settingsMap.adminEmail || 'admin@feellink.com',
      };
    } catch (error) {
      throw new Error(`Ayarlar alınamadı: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Suspend user
  async suspendUser(userId: string, actorId: string, data: { until?: Date | null; reason: string; note?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        suspendedUntil: data.until,
        suspensionReason: data.reason,
        suspensionNote: data.note,
        suspendedByAdminId: actorId,
      },
    });

    return { success: true, message: 'User suspended' };
  }

  // Unsuspend user
  async unsuspendUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        suspendedUntil: null,
        suspensionReason: null,
        suspensionNote: null,
        suspendedByAdminId: null,
      },
    });

    return { success: true, message: 'User unsuspended' };
  }

  // Get role change requests
  async getRoleChangeRequests(status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.roleChangeRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.roleChangeRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Approve role change request
  async approveRoleChangeRequest(requestId: string, adminId: string, reviewNote?: string) {
    const request = await this.prisma.roleChangeRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: { roles: [request.requestedRole] },
      }),
      this.prisma.roleChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNote,
        },
      }),
    ]);

    return { success: true, message: 'Request approved' };
  }

  // Reject role change request
  async rejectRoleChangeRequest(requestId: string, adminId: string, reviewNote?: string) {
    const request = await this.prisma.roleChangeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

    await this.prisma.roleChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote,
      },
    });

    return { success: true, message: 'Request rejected' };
  }
}

