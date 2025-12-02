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
  articleId?: string;
  commentId?: string;
  targetUrl?: string;
}

type NotifType = 'mention' | 'follow' | 'follow_request' | 'follow_accept' | 'like' | 'comment' | 'reply' | 'event_join' | 'event_comment' | 'event_like' | 'event_ticket_purchased' | 'ticket_confirmation';

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
          case 'reply':
            message = `yorumuna yanıt verdi`;
            break;
          case 'comment_like':
            message = `yorumunu beğendi`;
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
          case 'event_join':
            message = `etkinliğinize katıldı`;
            break;
          case 'event_comment':
            message = `etkinliğinize yorum yaptı`;
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
        articleId: data.articleId,
        commentId: data.commentId,
        targetUrl: data.targetUrl,
        isRead: false,
      },
      include: {
        fromUser: {
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

    const notificationData = {
      ...notification,
      sender: notification.fromUser || null,
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
      include: {
        fromUser: {
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

    // Notification'ları frontend için formatla
    return notifications.map((notification) => {
      const { fromUser, ...rest } = notification;
      return {
        ...rest,
        sender: fromUser || null,
        payload: {
          fromUserId: notification.fromUserId,
          postId: notification.postId,
          commentId: notification.commentId,
        },
      };
    });
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

  /**
   * 🎫 Bilet satın alma bildirimi oluştur
   * Hem kurumsal hesaba (biri bilet aldı) hem de kullanıcıya (bilet onayı) bildirim gönderir
   */
  async createEventTicketNotification(eventId: string, buyerId: string) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { owner: true },
      });

      if (!event) {
        console.error('Event not found for notification:', eventId);
        return;
      }

      const buyer = await this.prisma.user.findUnique({
        where: { id: buyerId },
        select: { username: true, fullName: true },
      });

      if (!buyer) {
        console.error('Buyer not found for notification:', buyerId);
        return;
      }

      const buyerName = buyer.fullName || buyer.username;

      // 1️⃣ Kurumsal tarafa bildirim: biri bilet aldı
      if (event.ownerId !== buyerId) {
        // Sadece kendi biletini almadıysa bildirim gönder
        await this.createNotificationSync({
          userId: event.ownerId,
          type: 'event_ticket_purchased',
          fromUserId: buyerId,
          message: `${buyerName} "${event.title}" etkinliğiniz için bir bilet satın aldı.`,
          targetUrl: `/events/${eventId}`,
        });
      }

      // 2️⃣ Kullanıcıya bildirim: bilet onayı
      await this.createNotificationSync({
        userId: buyerId,
        type: 'ticket_confirmation',
        message: `"${event.title}" etkinliği için biletin oluşturuldu.`,
        targetUrl: `/my-tickets`,
      });

      console.log(`✅ Ticket notification created for event ${eventId} and buyer ${buyerId}`);
    } catch (error) {
      console.error('❌ Error creating ticket notification:', error);
    }
  }
}


