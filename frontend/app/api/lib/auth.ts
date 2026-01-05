import { NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { prisma } from './prisma'

export interface AuthUser {
  id: string
  username: string
  email: string
  roles: string[]
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('access_token')?.value

    if (!token) {
      return null
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set')
      return null
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        roles: true,
        accountStatus: true,
        suspendedUntil: true,
      },
    })

    if (!user || user.accountStatus === 'SUSPENDED') {
      return null
    }

    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

