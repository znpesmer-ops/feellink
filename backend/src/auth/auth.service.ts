import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../search/search.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ensureRoleAssignment,
  computeCapabilities,
  normalizeRoles,
  isValidRole,
  getSidebarVisibility,
} from '../roles/roles.utils';
import { SubscriptionPlanCode, UserRoleCode } from '../roles/roles.types';
import { getDashboardSnapshot } from '../dashboard/dashboard.features';
import { getBadgesFromSelection } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private searchService: SearchService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  private readonly authSelect = {
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
    createdAt: true,
  } as const;

  private hydrateAuthUser(user: any) {
    const plan = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const roles = normalizeRoles(user.roles as string[]);
    const badgeIds = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const capabilities = computeCapabilities(roles, plan, badgeIds);
    const primaryRole = roles.length > 0 ? roles[0] : 'art_lover';
    const dashboard = getDashboardSnapshot(primaryRole, plan);
    const sidebar = getSidebarVisibility(capabilities);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        roles: capabilities.roles,
        extras: (user.extras as string[]) ?? [],
        plan: capabilities.plan,
        badges: badgeIds,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      capabilities,
      dashboard,
      sidebar,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, username, password, fullName, role } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - roles are empty until user configures dashboard
    const initialRoles = role && isValidRole(role) ? [role] : [];

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullName,
        roles: initialRoles,
        plan: 'FREE',
        badges: [],
      },
      select: {
        ...this.authSelect,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Index user in Meilisearch for fast search
    try {
      await this.searchService.indexUser(user);
    } catch (error) {
      console.error('Error indexing new user:', error);
      // Continue even if indexing fails
    }

    const payload = this.hydrateAuthUser(user);
    const needsRoleSelection = (user.roles?.length ?? 0) === 0;

    return {
      ...payload,
      ...tokens,
      needsRoleSelection,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    const { password: _, ...userWithoutPassword } = user;
    const payload = this.hydrateAuthUser(userWithoutPassword);
    const needsRoleSelection = (user.roles?.length ?? 0) === 0;

    return {
      ...payload,
      ...tokens,
      needsRoleSelection,
    };
  }

  async corporateLogin(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto, { requireCorporate: true });

    if (!user) {
      throw new UnauthorizedException('Kurumsal hesap bulunamadı veya yetkisiz.');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    const { password: _, ...userWithoutPassword } = user;
    const payload = this.hydrateAuthUser(userWithoutPassword);
    const needsRoleSelection = (user.roles?.length ?? 0) === 0;

    return {
      ...payload,
      ...tokens,
      needsRoleSelection,
    };
  }

  private async generateTokens(userId: string) {
    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(
      { userId },
      {
        expiresIn: '15m',
      },
    );

    // Generate refresh token (30 days)
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Save refresh token to database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    // Find refresh token in database
    const tokenData = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenData.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: tokenData.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenData.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(tokenData.userId);

    const user = await this.prisma.user.findUnique({
      where: { id: tokenData.userId },
      select: {
        ...this.authSelect,
      },
    });

    const payload = this.hydrateAuthUser(user);

    return {
      ...payload,
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    // Delete refresh token
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    // Delete all refresh tokens for user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices' };
  }

  // Unified login - works for all roles
  async loginUnified(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    const { password: _, ...userWithoutPassword } = user;
    const payload = this.hydrateAuthUser(userWithoutPassword);
    const needsRoleSelection = (user.roles?.length ?? 0) === 0;

    return {
      ...payload,
      ...tokens,
      needsRoleSelection,
    };
  }

  async validateUser(loginDto: LoginDto, options?: { requireCorporate?: boolean }) {
    const { password } = loginDto;
    if (!password) {
      return null;
    }

    const whereClause = this.buildLoginWhereClause(loginDto, options);

    const user = await this.prisma.user.findFirst({
      where: {
        ...whereClause,
      },
      select: {
        ...this.authSelect,
        password: true,
      },
    });

    if (!user) {
      return null;
    }

    const passwordValid = await this.verifyAndMigratePassword(password, user);

    if (!passwordValid) {
      return null;
    }

    return user;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.authSelect,
      },
    });

    return this.hydrateAuthUser(user);
  }

  private async verifyAndMigratePassword(
    plainPassword: string,
    user: { id: string; password: string },
  ): Promise<boolean> {
    const storedHash = user.password;

    // 1) Modern bcrypt hash (yeni kayıtlar)
    if (storedHash.startsWith('$2')) {
      return bcrypt.compare(plainPassword, storedHash);
    }

    // 2) 40 karakterlik legacy hash (halihazırda destekleniyor)
    if (storedHash.length === 40) {
      const legacySalt = storedHash.slice(0, 22);
      const saltString = `$2b$10$${legacySalt}`;

      try {
        const computedHash = await bcrypt.hash(plainPassword, saltString);
        const legacyComputed = legacySalt + computedHash.slice(-18);

        if (legacyComputed === storedHash) {
          // Doğruysa bcrypt formatına migrate et
          try {
            const newHash = await bcrypt.hash(plainPassword, 10);
            await this.prisma.user.update({
              where: { id: user.id },
              data: { password: newHash },
            });
          } catch (rehashError) {
            this.logger.warn(
              `Legacy password migration failed for user ${user.id}: ${
                rehashError instanceof Error ? rehashError.message : rehashError
              }`,
            );
          }

          return true;
        }
      } catch (legacyError) {
        this.logger.warn(
          `Legacy password check failed for user ${user.id}: ${
            legacyError instanceof Error ? legacyError.message : legacyError
          }`,
        );
        return false;
      }
    }

    // 3) Son çare: düz metin legacy parola
    if (storedHash === plainPassword) {
      try {
        const newHash = await bcrypt.hash(plainPassword, 10);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: newHash },
        });
      } catch (rehashError) {
        this.logger.warn(
          `Plain-text password migration failed for user ${user.id}: ${
            rehashError instanceof Error ? rehashError.message : rehashError
          }`,
        );
      }

      return true;
    }

    // Tanınmayan başka bir format ise: reddet
    return false;
  }

  private buildLoginWhereClause(loginDto: LoginDto, options?: { requireCorporate?: boolean }) {
    const normalize = (value?: string) => value?.trim();
    const ors = [];

    const username = normalize(loginDto.username);
    if (username) {
      ors.push({ username });
    }

    const email = normalize(loginDto.email);
    if (email) {
      ors.push({ email });
    }

    const emailOrUsername = normalize(loginDto.emailOrUsername);
    if (emailOrUsername) {
      ors.push({ username: emailOrUsername }, { email: emailOrUsername });
    }

    if (!ors.length) {
      throw new UnauthorizedException('E-posta veya kullanıcı adı gerekli');
    }

    const whereClause: Record<string, unknown> = {
      OR: ors,
    };

    if (options?.requireCorporate) {
      whereClause.roles = { has: 'corporate' };
    }

    return whereClause;
  }

  // Set user role
  async setUserRole(userId: string, role: string) {
    const legacyToNew: Record<string, UserRoleCode> = {
      USER: 'art_lover',
      user: 'art_lover',
      ART_LOVER: 'art_lover',
      art_lover: 'art_lover',
      CORPORATE: 'corporate',
      corporate: 'corporate',
      COLLECTOR: 'collector',
      collector: 'collector',
      ARTIST: 'artist',
      artist: 'artist',
      MUSEUM: 'artist',
      museum: 'artist',
    };

    const mapped = legacyToNew[role];

    if (!mapped) {
      throw new UnauthorizedException('Invalid role');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        plan: true,
        extras: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const mergedRoles = ensureRoleAssignment([mapped]);
    const plan = (existing.plan as SubscriptionPlanCode) ?? 'FREE';
    const extras = Array.isArray(existing.extras) ? (existing.extras as string[]) : [];
    const nextBadges = getBadgesFromSelection(mergedRoles, plan, extras);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: mergedRoles,
        badges: nextBadges,
      },
      select: {
        ...this.authSelect,
      },
    });

    try {
      await this.searchService.indexUser(updated);
    } catch (error) {
      console.error('Error updating user in search index:', error);
    }

    return this.hydrateAuthUser(updated);
  }
}

