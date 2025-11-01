import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class StoriesService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async createStory(userId: string, mediaUrl: string, mediaType: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    return this.prisma.story.create({
      data: {
        userId,
        mediaUrl,
        mediaType,
        expiresAt,
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
  }

  async getStories(userId: string) {
    // Get stories from users that the current user follows
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    const stories = await this.prisma.story.findMany({
      where: {
        userId: { in: followingIds },
        expiresAt: { gt: new Date() },
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
        _count: {
          select: {
            views: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by user
    const groupedStories: any = {};
    for (const story of stories) {
      if (!groupedStories[story.userId]) {
        groupedStories[story.userId] = {
          user: story.user,
          stories: [],
        };
      }
      groupedStories[story.userId].stories.push(story);
    }

    return Object.values(groupedStories);
  }

  async viewStory(storyId: string, userId: string) {
    // Check if already viewed
    const existingView = await this.prisma.storyView.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
    });

    if (existingView) {
      return existingView;
    }

    return this.prisma.storyView.create({
      data: {
        storyId,
        userId,
      },
    });
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story || story.userId !== userId) {
      throw new Error('Story not found or unauthorized');
    }

    await this.mediaService.deleteFile(story.mediaUrl);
    await this.prisma.story.delete({
      where: { id: storyId },
    });

    return { status: 'deleted' };
  }
}



