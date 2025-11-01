import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationDto {
  userId: string;
  type: string;
  message?: string;
  fromUserId?: string;
  postId?: string;
  commentId?: string;
}

type NotifType = 'mention' | 'follow' | 'follow_request' | 'follow_accept' | 'like' | 'comment';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @Inject(forwardRef(() => NotificationsGateway)) private notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(data: CreateNotificationDto) {
    // Add to queue for processing
    await this.notificationsQueue.add('create-notification', data);

    return { queued: true };
  }

  async createNotificationSync(data: CreateNotificationDto) {
    // Eğer message yoksa, fromUserId'den kullanıcı bilgisini al ve message oluştur
    let message = data.message;
    if (!message && data.fromUserId) {
      const fromUser = await this.prisma.user.findUnique({
        where: { id: data.fromUserId },
        select: { username: true, fullName: true },
      });
      
      if (fromUser) {
        const displayName = fromUser.fullName || fromUser.username;
        switch (data.type) {
          case 'like':
            message = `gönderini beğendi`;
            break;
          case 'comment':
            message = `gönderine yorum yaptı`;
            break;
          case 'follow':
            message = `seni takip etmeye başladı`;
            break;
          case 'follow_request':
            message = `seni takip etmek istiyor`;
            break;
          case 'follow_accept':
            message = `takip isteğini kabul etti`;
            break;
          case 'message':
            message = `sana yeni bir mesaj gönderdi`;
            break;
          case 'mention':
            message = `seni bir yorumda etiketledi`;
            break;
          default:
            message = `yeni bir etkinlik gerçekleştirdi`;
        }
        // Display name mesajın başına eklenmiyor, frontend'de ekleniyor
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: message,
        fromUserId: data.fromUserId,
        postId: data.postId,
        commentId: data.commentId,
        isRead: false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    // Socket üzerinden bildirimi gönder
    const fromUser = data.fromUserId ? await this.prisma.user.findUnique({
      where: { id: data.fromUserId },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        isVerified: true,
      },
    }) : null;

    const notificationData = {
      ...notification,
      user: fromUser,
    };

    this.notificationsGateway.notifyUser(data.userId, notificationData);

    return notification;
  }

  async getNotifications(userId: string, limit: number = 20, offset: number = 0) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get user info for fromUserId
    const fromUserIds = notifications
      .map(n => n.fromUserId)
      .filter((id): id is string => !!id);
    
    const fromUsers = fromUserIds.length > 0 
      ? await this.prisma.user.findMany({
          where: { id: { in: fromUserIds } },
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        })
      : [];

    const fromUsersMap = new Map(fromUsers.map(u => [u.id, u]));

    // Notification'ları frontend için formatla
    return notifications.map((notification) => ({
      ...notification,
      user: fromUsersMap.get(notification.fromUserId || '') || null,
      payload: {
        fromUserId: notification.fromUserId,
        postId: notification.postId,
        commentId: notification.commentId,
      },
    }));
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    })

    if (!notification) {
      throw new Error('Notification not found or unauthorized')
    }

    // Sadece okunmamış bildirimleri güncelle
    if (!notification.isRead) {
      const updated = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
        },
      })

      // 🔔 Socket.IO ile gerçek zamanlı güncelleme gönder
      this.notificationsGateway.notifyNotificationRead(userId, notificationId)

      console.log(`✅ Notification marked as read: ${notificationId} for user ${userId}`)
      
      return updated
    }

    return { count: 0 }
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // 🔔 Bildirim ayarları (preferences)
  async getPrefs(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // İlk kez oluşturuluyor, default değerlerle oluştur
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePrefs(userId: string, data: Partial<Record<NotifType, boolean>>) {
    // Önce preference'ı oluştur (yoksa)
    await this.getPrefs(userId);
    
    return this.prisma.notificationPreference.update({
      where: { userId },
      data,
    });
  }

  // 🔔 Bildirim gönderilmesine izin var mı kontrol et
  async isAllowed(toUserId: string, type: NotifType): Promise<boolean> {
    const prefs = await this.getPrefs(toUserId);
    
    // Type mapping: bazı bildirim tipleri farklı preference'lara karşılık geliyor
    switch (type) {
      case 'mention':
        return prefs.mention;
      case 'follow':
      case 'follow_request':
      case 'follow_accept':
        return prefs.follow;
      case 'like':
        return prefs.like;
      case 'comment':
        return prefs.comment;
      default:
        // Diğer tipler (message, vb.) için varsayılan olarak true
        return true;
    }
  }
}


