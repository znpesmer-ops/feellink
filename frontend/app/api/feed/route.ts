import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '../lib/auth'
import { prisma } from '../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get user's following list
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    })

    const followingIds = following.map((f) => f.followingId)
    followingIds.push(user.id) // Include own posts

    // Get posts from followed users
    const posts = await prisma.post.findMany({
      where: {
        userId: { in: followingIds },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
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
        media: {
          orderBy: { order: 'asc' },
        },
        likes: {
          select: { userId: true },
        },
        comments: {
          take: 2,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

