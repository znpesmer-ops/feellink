import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get('JWT_SECRET') || 'default-secret-change-in-production';
    if (!configService.get('JWT_SECRET')) {
      console.warn('⚠️ JWT_SECRET not set, using default secret. This is insecure for production!');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
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
        superAdmin: true, // 🔥 GOD-MODE
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      ...user,
      plan: user.plan ?? 'FREE', // Null-safe: plan null ise 'FREE' kullan
      badges: Array.isArray(user.badges) ? user.badges : [],
    };
  }
}


