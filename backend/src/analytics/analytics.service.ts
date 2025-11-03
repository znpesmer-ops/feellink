import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get visit statistics for a corporate user
   * Based on interactions (likes, comments, event participations) on their content
   */
  async getVisitStats(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all posts by this corporate user
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true, createdAt: true },
    });

    const postIds = userPosts.map((p) => p.id);

    // Get interactions grouped by date
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    const comments = await this.prisma.comment.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // Get event participations
    const userEvents = await this.prisma.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    const eventParticipations = await this.prisma.eventParticipant.findMany({
      where: {
        eventId: { in: eventIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // Combine all interactions
    const allInteractions = [
      ...likes.map((l) => l.createdAt),
      ...comments.map((c) => c.createdAt),
      ...eventParticipations.map((ep) => ep.createdAt),
    ];

    // Group by date
    const dateMap = new Map<string, number>();
    allInteractions.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    // Generate last 30 days
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  /**
   * Get top words from comments on corporate user's posts and events
   */
  async getTopWords(userId: string) {
    // Get comments on user's posts
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true },
    });

    const postIds = userPosts.map((p) => p.id);

    const postComments = await this.prisma.comment.findMany({
      where: { postId: { in: postIds } },
      select: { content: true },
    });

    // Get comments on user's events
    const userEvents = await this.prisma.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    const eventComments = await this.prisma.eventComment.findMany({
      where: { eventId: { in: eventIds } },
      select: { text: true },
    });

    // Combine all comments
    const allComments = [
      ...postComments.map((c) => c.content),
      ...eventComments.map((c) => c.text),
    ];

    // Count words (Turkish stop words excluded)
    const stopWords = new Set([
      'bir',
      'bu',
      'şu',
      'o',
      've',
      'ile',
      'için',
      'gibi',
      'kadar',
      'daha',
      'çok',
      'en',
      'da',
      'de',
      'ki',
      'mi',
      'mı',
      'mu',
      'mü',
      'ama',
      'fakat',
      'ancak',
      'lakin',
      'veya',
      'ya',
      'ya da',
      'hem',
      'ne',
      'mi',
      'mü',
      'için',
      'ile',
      'gibi',
      'kadar',
    ]);

    const wordMap = new Map<string, number>();

    allComments.forEach((comment) => {
      if (!comment) return;

      // Extract words (Turkish characters included)
      const words = comment
        .toLowerCase()
        .replace(/[^\wğüşıöçĞÜŞİÖÇ\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      words.forEach((word) => {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      });
    });

    // Return top 20 words
    return Array.from(wordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Get top visitors (users who interact most with corporate user's content)
   */
  async getTopVisitors(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get user's posts and events
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true },
    });

    const postIds = userPosts.map((p) => p.id);

    const userEvents = await this.prisma.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    // Get all interactions
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
    });

    const comments = await this.prisma.comment.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
    });

    const eventComments = await this.prisma.eventComment.findMany({
      where: {
        eventId: { in: eventIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { authorId: true },
    });

    const eventParticipations = await this.prisma.eventParticipant.findMany({
      where: {
        eventId: { in: eventIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
    });

    // Count interactions per user (excluding the corporate user themselves)
    const userActivityMap = new Map<string, number>();

    [...likes, ...comments].forEach((item) => {
      const uid = item.userId;
      // 🚫 Kendini listeye dahil etme
      if (uid !== userId) {
        userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
      }
    });

    eventComments.forEach((item) => {
      const uid = item.authorId;
      // 🚫 Kendini listeye dahil etme
      if (uid !== userId) {
        userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
      }
    });

    eventParticipations.forEach((item) => {
      const uid = item.userId;
      // 🚫 Kendini listeye dahil etme
      if (uid !== userId) {
        userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
      }
    });

    // Get user details for top 10
    const sortedUsers = Array.from(userActivityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const users = await Promise.all(
      sortedUsers.map(async ([uid, count]) => {
        const user = await this.prisma.user.findUnique({
          where: { id: uid },
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        });

        if (!user) return null;

        return {
          username: user.username,
          avatar: user.avatar,
          fullName: user.fullName,
          activityCount: count,
        };
      }),
    );

    return users.filter((u) => u !== null);
  }

  /**
   * 🎟️ Etkinlik istatistikleri (bilet satışları ve yorumlar)
   * Kurumsal kullanıcının etkinliklerine ait bilet ve yorum verilerini döndürür
   */
  async getEventStats(userId: string) {
    const events = await this.prisma.event.findMany({
      where: { ownerId: userId },
      include: {
        tickets: {
          include: {
            purchases: {
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
              orderBy: {
                createdAt: 'desc',
              },
              take: 5, // Son 5 bilet
            },
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map((event) => {
      // Tüm biletlerden toplam satış sayısı
      const totalTicketSales = event.tickets.reduce((sum, ticket) => sum + ticket.sold, 0);

      // Son 5 bilet (tüm biletlerden son 5 satın alma)
      const allPurchases = event.tickets.flatMap((ticket) =>
        ticket.purchases.map((purchase) => ({
          username: purchase.user.username,
          fullName: purchase.user.fullName,
          avatar: purchase.user.avatar,
          createdAt: purchase.createdAt,
        }))
      );

      // Tarihe göre sırala ve son 5'i al
      const recentTickets = allPurchases
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      return {
        id: event.id,
        title: event.title,
        ticketCount: totalTicketSales,
        totalCapacity: event.tickets.reduce((sum, ticket) => sum + ticket.capacity, 0),
        commentCount: event.comments.length,
        recentTickets,
      };
    });
  }
}

