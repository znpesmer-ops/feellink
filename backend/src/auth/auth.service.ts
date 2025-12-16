import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../search/search.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private searchService: SearchService,
    private mailService: MailService,
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
    superAdmin: true, // 🔥 GOD-MODE
    createdAt: true,
  } as const;

  private hydrateAuthUser(user: any) {
    // Null check: user null ise hata fırlat
    if (!user) {
      throw new UnauthorizedException('User data not found');
    }

    // Null-safe plan handling: plan null/undefined ise 'FREE' kullan
    const plan: SubscriptionPlanCode = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const roles = normalizeRoles(user.roles as string[]);
    const badgeIds = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const isAdmin = user.isAdmin === true || user.superAdmin === true;
    
    // 🔥 Admin kullanıcılar için tüm özellikleri açık yap (SaaS mantığı)
    let capabilities = computeCapabilities(roles, plan, badgeIds);
    
    if (isAdmin) {
      // Admin için tüm özellikleri açık yap
      capabilities = {
        ...capabilities,
        permissions: {
          canCreateEvents: true,
          canAccessMyEvents: true,
          canAccessCollections: true,
          canManageCollections: true,
          canAccessAnalytics: true,
          canCreateListings: true,
          canCreateArtworks: true,
        },
        sidebar: {
          home: true,
          explore: true,
          messages: true,
          profile: true,
          createEvent: true,
          myEvents: true,
          collections: true,
          manageCollections: true,
          analytics: true,
          listings: true,
          badges: true,
        },
        limits: {
          eventLimitMonthly: null, // Sınırsız
          artworkLimitMonthly: null, // Sınırsız
          eventCooldownMonths: null, // Sınırsız
        },
      };
    }
    
    const primaryRole = roles.length > 0 ? roles[0] : 'art_lover';
    const dashboard = getDashboardSnapshot(primaryRole, plan);
    const sidebar = getSidebarVisibility(capabilities);

    return {
      user: {
        id: user.id ?? '',
        username: user.username ?? '',
        email: user.email ?? '',
        fullName: user.fullName ?? null,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        roles: capabilities.roles,
        extras: (user.extras as string[]) ?? [],
        plan: capabilities.plan,
        badges: badgeIds,
        isPrivate: user.isPrivate ?? false,
        isVerified: user.isVerified ?? false,
        isAdmin: user.isAdmin ?? false,
        superAdmin: user.superAdmin ?? false, // 🔥 GOD-MODE
        createdAt: user.createdAt ?? new Date(),
      },
      capabilities,
      dashboard,
      sidebar,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, username, password, fullName, role } = registerDto;

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user - roles are empty until user configures dashboard
      const initialRoles = role && isValidRole(role) ? [role] : [];

      const user = await this.prisma.user.create({
        data: {
          email,
          username, // Already lowercase from Transform decorator
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
    } catch (err) {
      // Prisma unique constraint hatası (email veya username çakışması)
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[]) || [];
        if (target.includes('email')) {
          throw new ConflictException('Bu e-posta adresi zaten kullanımda');
        }
        if (target.includes('username')) {
          throw new ConflictException('Bu kullanıcı adı zaten kullanımda');
        }
        throw new ConflictException('Bu bilgilerle kayıtlı bir kullanıcı zaten var');
      }

      // Validation dışındaki diğer hatalar
      this.logger.error('Registration error:', err);
      throw new BadRequestException('Kayıt işlemi sırasında bir hata oluştu');
    }
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

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

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

  private createPasswordResetToken() {
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(resetToken).digest('hex');
    return { resetToken, hashedToken };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Kullanıcı yoksa bile "başarılı" dön -> güvenlik
    if (!user) {
      return { message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı gönderildi.' };
    }

    const { resetToken, hashedToken } = this.createPasswordResetToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 saat geçerli

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Gerçek mail gönderimi
    let mailSent = false;
    try {
      await this.mailService.sendPasswordResetMail(email, resetUrl);
      this.logger.log(`✅ Password reset email sent successfully to ${email}`);
      mailSent = true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      
      // Development ortamında console'a link yazdır
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`\n🔗 DEVELOPMENT MODE - Password reset link for ${email}:`);
        this.logger.warn(`   ${resetUrl}\n`);
        this.logger.warn('⚠️  Mail gönderimi başarısız oldu. SMTP ayarlarını kontrol edin.');
        this.logger.warn('   Yukarıdaki linki kopyalayıp tarayıcıda açabilirsiniz.\n');
      }
      
      // Mail gönderimi başarısız olsa bile kullanıcıya başarılı mesajı dön (güvenlik)
    }

    return {
      message:
        'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
      // Development ortamında mail gönderimi başarısız olduğunda frontend'e bilgi ver
      ...(process.env.NODE_ENV !== 'production' && !mailSent
        ? {
            developmentMode: true,
            resetUrl: resetUrl,
          }
        : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    const hashedToken = createHash('sha256').update(token).digest('hex');
    const now = new Date();

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: now,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.' };
  }
}

