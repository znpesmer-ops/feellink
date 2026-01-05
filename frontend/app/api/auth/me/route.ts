import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '../../lib/auth'
import { prisma } from '../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        avatar: true,
        bio: true,
        roles: true,
        plan: true,
        badges: true,
        isPrivate: true,
        isVerified: true,
        isAdmin: true,
        followerCount: true,
        followingCount: true,
      },
    })

    if (!fullUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(fullUser)
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    )
  }
}

