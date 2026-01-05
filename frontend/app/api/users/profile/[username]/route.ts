import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    const { username } = await params

    if (!username) {
      return NextResponse.json({ message: 'Username required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        bio: true,
        isPrivate: true,
        isVerified: true,
        followerCount: true,
        followingCount: true,
        roles: true,
        plan: true,
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Check if private account and not following
    if (user.isPrivate && currentUser?.id !== user.id) {
      const isFollowing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser?.id || '',
            followingId: user.id,
          },
        },
      })

      if (!isFollowing) {
        return NextResponse.json({
          ...user,
          isPrivate: true,
          posts: [],
        })
      }
    }

    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          orderBy: { order: 'asc' },
          take: 1, // Just first media for grid
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...user,
      posts,
    })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

