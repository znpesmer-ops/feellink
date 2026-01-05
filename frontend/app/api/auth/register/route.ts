import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, fullName, role, termsAccepted } = body

    if (!email || !username || !password) {
      return NextResponse.json(
        { message: 'Email, kullanıcı adı ve şifre gereklidir' },
        { status: 400 }
      )
    }

    if (termsAccepted !== true) {
      return NextResponse.json(
        { message: 'Kullanıcı sözleşmesi kabul edilmeden kayıt olunamaz' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { message: 'Bu e-posta adresi zaten kullanımda' },
          { status: 409 }
        )
      }
      if (existingUser.username === username.toLowerCase()) {
        return NextResponse.json(
          { message: 'Bu kullanıcı adı zaten kullanımda' },
          { status: 409 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const initialRoles = role && ['art_lover', 'corporate', 'collector', 'artist'].includes(role) ? [role] : []
    
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        fullName,
        roles: initialRoles,
        plan: 'FREE',
        badges: [],
        termsAcceptedAt: new Date(),
      },
    })

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
      needsRoleSelection: initialRoles.length === 0,
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error: any) {
    console.error('Register error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Bu bilgilerle kayıtlı bir kullanıcı zaten var' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { message: 'Kayıt işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}

