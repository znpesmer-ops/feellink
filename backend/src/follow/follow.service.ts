import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Takip sayılarını doğru yönde artırır
   * @param followerId - Takip eden kullanıcı (followingCount artar)
   * @param followeeId - Takip edilen kullanıcı (followerCount artar)
   */
  private async incrementFollowCounts(followerId: string, followeeId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followeeId },
        data: { followerCount: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Takip sayılarını doğru yönde azaltır
   * @param followerId - Takip eden kullanıcı (followingCount azalır)
   * @param followeeId - Takip edilen kullanıcı (followerCount azalır)
   */
  private async decrementFollowCounts(followerId: string, followeeId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followeeId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const following = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!following) {
      throw new NotFoundException('User not found');
    }

    // Check if blocked
    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: followingId },
          { blockerId: followingId, blockedId: followerId },
        ],
      },
    });

    if (isBlocked) {
      throw new ForbiddenException('Cannot follow this user');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this user');
    }

    // If user is private, create follow request
    if (following.isPrivate) {
      // Check if request already exists
      const existingRequest = await this.prisma.followRequest.findUnique({
        where: {
          requesterId_requestedId: {
            requesterId: followerId,
            requestedId: followingId,
          },
        },
      });

      if (existingRequest) {
        throw new BadRequestException('Follow request already sent');
      }

      await this.prisma.followRequest.create({
        data: {
          requesterId: followerId,
          requestedId: followingId,
        },
      });

      // Send notification (preference kontrolü ile)
      const allowed = await this.notificationsService.isAllowed(followingId, 'follow_request')
      
      if (allowed) {
        await this.notificationsService.createNotification({
          userId: followingId,
          type: 'follow_request',
          fromUserId: followerId,
        });
      } else {
        console.log(`⏭️ Follow request notification skipped (preference disabled)`)
      }

      return { status: 'requested' };
    }

    // If public, follow directly
    await this.prisma.$transaction(async (tx) => {
      await tx.follow.create({
        data: {
          followerId,
          followingId,
        },
      });
    });

    // Update follower counts using helper method
    await this.incrementFollowCounts(followerId, followingId);

    // Send notification (preference kontrolü ile)
    const allowed = await this.notificationsService.isAllowed(followingId, 'follow')
    
    if (allowed) {
      await this.notificationsService.createNotification({
        userId: followingId,
        type: 'follow',
        fromUserId: followerId,
      });
    } else {
      console.log(`⏭️ Follow notification skipped (preference disabled)`)
    }

    return { status: 'following' };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      return { status: 'unfollowed' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });
    });

    // Update follower counts using helper method
    await this.decrementFollowCounts(followerId, followingId);

    return { status: 'unfollowed' };
  }

  async acceptFollowRequest(requestedId: string, requesterId: string) {
    const request = await this.prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId,
          requestedId,
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Follow request not found');
    }

    // Check if already following (prevent duplicate)
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: requesterId,
          followingId: requestedId,
        },
      },
    });

    if (existingFollow) {
      // Delete request if already following
      await this.prisma.followRequest.delete({
        where: {
          id: request.id,
        },
      });
      throw new BadRequestException('Already following this user');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete request
      await tx.followRequest.delete({
        where: {
          id: request.id,
        },
      });

      // Create follow relationship
      await tx.follow.create({
        data: {
          followerId: requesterId,
          followingId: requestedId,
        },
      });

      // Delete the follow_request notification (only for this specific request)
      await tx.notification.deleteMany({
        where: {
          userId: requestedId,
          type: 'follow_request',
          fromUserId: requesterId,
        },
      });
    });

    // Update follower counts using helper method
    // requesterId = takip eden (followingCount artar)
    // requestedId = takip edilen (followerCount artar)
    await this.incrementFollowCounts(requesterId, requestedId);

    // Send notification to requester that request was accepted (preference kontrolü ile)
    const allowed = await this.notificationsService.isAllowed(requesterId, 'follow_accept')
    
    if (allowed) {
      await this.notificationsService.createNotification({
        userId: requesterId,
        type: 'follow_accept',
        fromUserId: requestedId,
      });
    } else {
      console.log(`⏭️ Follow accept notification skipped (preference disabled)`)
    }

    return { status: 'accepted' };
  }

  async rejectFollowRequest(requestedId: string, requesterId: string) {
    const request = await this.prisma.followRequest.findUnique({
      where: {
        requesterId_requestedId: {
          requesterId,
          requestedId,
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Follow request not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete request
      await tx.followRequest.delete({
        where: {
          id: request.id,
        },
      });

      // Delete the follow_request notification
      await tx.notification.deleteMany({
        where: {
          userId: requestedId,
          type: 'follow_request',
          fromUserId: requesterId,
        },
      });
    });

    return { status: 'rejected' };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check existing follow relationships
    const follow1 = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: blockerId,
          followingId: blockedId,
        },
      },
    });

    const follow2 = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: blockedId,
          followingId: blockerId,
        },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      // Remove any existing follow relationships
      if (follow1) {
        await tx.follow.delete({
          where: {
            followerId_followingId: {
              followerId: blockerId,
              followingId: blockedId,
            },
          },
        });
      }

      if (follow2) {
        await tx.follow.delete({
          where: {
            followerId_followingId: {
              followerId: blockedId,
              followingId: blockerId,
            },
          },
        });
      }

      // Remove follow requests
      await tx.followRequest.deleteMany({
        where: {
          OR: [
            { requesterId: blockerId, requestedId: blockedId },
            { requesterId: blockedId, requestedId: blockerId },
          ],
        },
      });

      // Create block
      await tx.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
        create: {
          blockerId,
          blockedId,
        },
        update: {},
      });
    });

    // Update counts after blocking (if follow relationships existed)
    if (follow1) {
      await this.decrementFollowCounts(blockerId, blockedId);
    }
    if (follow2) {
      await this.decrementFollowCounts(blockedId, blockerId);
    }

    return { status: 'blocked' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });

    return { status: 'unblocked' };
  }

  async getFollowRequests(userId: string) {
    const requests = await this.prisma.followRequest.findMany({
      where: { requestedId: userId },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  async getFollowers(userId: string, currentUserId?: string) {
    // Sadece bu userId'yi takip eden kullanıcıları getir
    // Follow tablosunda zaten sadece onaylanmış ilişkiler var
    const followers = await this.prisma.follow.findMany({
      where: { 
        followingId: userId, // userId'yi takip edenler
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return followers.map(f => f.follower);
  }

  async getFollowing(userId: string, currentUserId?: string) {
    // Sadece bu userId'nin takip ettiklerini getir
    // Follow tablosunda zaten sadece onaylanmış ilişkiler var
    const following = await this.prisma.follow.findMany({
      where: { 
        followerId: userId, // userId'nin takip ettikleri
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return following.map(f => f.following);
  }
}


