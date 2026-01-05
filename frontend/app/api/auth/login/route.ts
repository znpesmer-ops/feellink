import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailOrUsername, password } = body

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { message: 'Email/kullanıcı adı ve şifre gereklidir' },
        { status: 400 }
      )
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() },
        ],
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Geçersiz email/kullanıcı adı veya şifre' },
        { status: 401 }
      )
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Geçersiz email/kullanıcı adı veya şifre' },
        { status: 401 }
      )
    }

    // Check account status
    if (user.accountStatus === 'SUSPENDED') {
      return NextResponse.json(
        { message: 'Hesabınız askıya alınmış', code: 'ACCOUNT_SUSPENDED' },
        { status: 403 }
      )
    }

    // Generate tokens
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json(
        { message: 'Server configuration error' },
        { status: 500 }
      )
    }

    const accessToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '15m' })
    const refreshToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '30d' })

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // Set refresh token cookie
    const response = NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        roles: user.roles,
        plan: user.plan,
        badges: user.badges,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      },
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Giriş yapılırken bir hata oluştu' },
      { status: 500 }
    )
  }
}

