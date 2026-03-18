import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
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
import { ChangePasswordDto } from './dto/change-password.dto';
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
import { OtpService } from './otp.service';
import { OtpPurpose } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private searchService: SearchService,
    private mailService: MailService,
    private otpService: OtpService,
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
    profileCompleted: true,
    dateOfBirth: true,
    country: true,
    city: true,
    gender: true,
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

    // ✅ Aktif rolü hesapla (getProfile metodundaki mantıkla aynı)
    const getActiveRole = (roles: string[], isAdmin: boolean): string | null => {
      if (isAdmin) {
        return 'Admin';
      }
      if (!roles || roles.length === 0) {
        return null;
      }
      
      // Öncelik sırası: corporate > collector > artist > art_lover
      const rolePriority: Record<string, number> = {
        corporate: 1,
        collector: 2,
        artist: 3,
        art_lover: 4,
      };
      
      const sortedRoles = roles
        .filter((r) => rolePriority[r] !== undefined)
        .sort((a, b) => rolePriority[a] - rolePriority[b]);
      
      if (sortedRoles.length === 0) {
        return null;
      }
      
      const activeRoleCode = sortedRoles[0];
      const roleLabels: Record<string, string> = {
        art_lover: 'Sanatsever',
        corporate: 'Kurum',
        collector: 'Koleksiyoner',
        artist: 'Sanatçı',
      };
      
      return roleLabels[activeRoleCode] || null;
    };

    const activeRole = getActiveRole(roles, isAdmin);

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
        activeRole: activeRole || null, // 🎯 Aktif rol (profil header'da gösterilecek)
        profileCompleted: user.profileCompleted ?? false,
        dateOfBirth: user.dateOfBirth ?? null,
        country: user.country ?? null,
        city: user.city ?? null,
        gender: user.gender ?? null,
      },
      capabilities,
      dashboard,
      sidebar,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, username, password, fullName, role, termsAccepted } = registerDto;

    if (!this.configService.get<string>('JWT_SECRET')) {
      throw new BadRequestException(
        'Sunucu yapılandırma hatası (JWT_SECRET eksik). Lütfen destek ile iletişime geçin.',
      );
    }

    if (termsAccepted !== true) {
      throw new BadRequestException('Kullanıcı sözleşmesi kabul edilmeden kayıt olunamaz.');
    }

    const dbOk = await this.checkDatabase();
    if (!dbOk) {
      this.logger.warn('[REGISTER] DB check failed before create');
      throw new BadRequestException(
        'Kayıt işlemi şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.',
      );
    }

    try {
      // 🔥 DEBUG: Register işlemi başladı
      this.logger.log(`[REGISTER DEBUG] Starting registration for: ${email}`);
      this.logger.log(`[REGISTER DEBUG] Username: ${username}, FullName: ${fullName || 'N/A'}`);

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      this.logger.log(`[REGISTER DEBUG] Password hashed successfully`);

      // Create user - roles are empty until user configures dashboard
      const initialRoles = role && isValidRole(role) ? [role] : [];
      this.logger.log(`[REGISTER DEBUG] Initial roles: ${JSON.stringify(initialRoles)}`);

      const user = await this.prisma.user.create({
        data: {
          email,
          username, // Already lowercase from Transform decorator
          password: hashedPassword,
          fullName,
          roles: initialRoles,
          plan: 'FREE',
          badges: [],
          termsAccepted: true, // ✅ Kullanıcı sözleşmesi onay durumu
          termsAcceptedAt: new Date(), // ✅ Kullanıcı sözleşmesi onay tarihi
        },
        select: {
          ...this.authSelect,
        },
      });

      this.logger.log(`[REGISTER DEBUG] User created successfully: ${user.id}`);

      // Index user in Meilisearch for fast search
      try {
        await this.searchService.indexUser(user);
        this.logger.log(`[REGISTER DEBUG] User indexed in Meilisearch`);
      } catch (error) {
        this.logger.warn(`[REGISTER DEBUG] Error indexing new user (non-critical): ${error instanceof Error ? error.message : error}`);
        // Continue even if indexing fails
      }

      // E-posta doğrulama OTP gönder (kayıt sonrası hesap aktifleşene kadar token verilmez)
      try {
        const { code } = await this.otpService.createOtp(user.email, OtpPurpose.signup_verification);
        await this.mailService.sendSignupOtpMail(user.email, code);
      } catch (otpErr: any) {
        this.logger.warn(`[REGISTER] Signup OTP send failed (non-blocking): ${otpErr?.message || otpErr}`);
      }

      this.logger.log(`[REGISTER DEBUG] Registration successful for: ${email}, needsEmailVerification`);

      return {
        needsEmailVerification: true,
        email: user.email,
      };
    } catch (err: any) {
      // Prisma unique constraint (email/username zaten var)
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[]) || [];
        this.logger.warn(`[REGISTER] Unique constraint: ${JSON.stringify(target)}`);
        if (target.includes('email')) {
          throw new ConflictException('Bu e-posta adresi zaten kullanımda');
        }
        if (target.includes('username')) {
          throw new ConflictException('Bu kullanıcı adı zaten kullanımda');
        }
        throw new ConflictException('Bu bilgilerle kayıtlı bir kullanıcı zaten var');
      }

      const errMessage =
        typeof err?.message === 'string'
          ? err.message
          : err?.error?.message ?? err?.response?.data?.message ?? String(err);
      const isDbError =
        !errMessage ||
        errMessage.includes('DATABASE_URL') ||
        errMessage.includes("Can't reach") ||
        errMessage.includes('connection') ||
        errMessage.includes('ECONNREFUSED') ||
        errMessage.includes('connect');
      const isAuthFailed =
        errMessage.includes('AuthenticationFailed') ||
        errMessage.includes('bad auth') ||
        errMessage.includes('SCRAM failure') ||
        errMessage.includes('authentication failed');

      this.logger.error(`[REGISTER] Error for ${email}:`, errMessage);

      // Kullanıcıya yalnızca genel mesaj; teknik detay sadece log’ta
      const userMessage =
        'Kayıt işlemi şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.';
      throw new BadRequestException(userMessage);
    }
  }

  async sendSignupOtp(email: string) {
    const normalized = email.trim().toLowerCase();
    const canResend = await this.otpService.canResend(normalized, OtpPurpose.signup_verification);
    if (!canResend) {
      throw new BadRequestException('Yeni kod için lütfen 1 dakika bekleyin.');
    }
    const { code } = await this.otpService.createOtp(normalized, OtpPurpose.signup_verification);
    await this.mailService.sendSignupOtpMail(normalized, code);
    return { message: 'Doğrulama kodu e-posta adresinize gönderildi.' };
  }

  async verifySignupOtp(email: string, code: string) {
    const normalized = email.trim().toLowerCase();
    await this.otpService.verifyOtp(normalized, OtpPurpose.signup_verification, code);
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { ...this.authSelect },
    });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });
    const updated = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { ...this.authSelect },
    });
    const tokens = await this.generateTokens(user.id);
    const payload = this.hydrateAuthUser(updated!);
    const needsRoleSelection = ((updated?.roles?.length) ?? 0) === 0;
    return { ...payload, ...tokens, needsRoleSelection };
  }

  async login(loginDto: LoginDto) {
    const loginIdentifier = loginDto.emailOrUsername || loginDto.email || loginDto.username;
    this.logger.log(`[LOGIN] Login attempt for: ${loginIdentifier}`);
    
    // 🔥 1. DB bağlantısı kontrolü - sadece hızlı ping (timeout önlemek için)
    // Prisma middleware zaten bağlantıyı kontrol ediyor, burada ekstra kontrol gereksiz
    // try {
    //   await this.prisma.$queryRaw`SELECT 1`;
    // } catch (dbError: any) {
    //   // Bağlantı sorunu varsa validateUser'da yakalanacak
    // }
    
    // 🔥 2. Kullanıcıyı bul
    let user;
    try {
      user = await this.validateUser(loginDto);
    } catch (dbError: any) {
      // DB hatası (connection timeout, etc.) - auth hatası değil
      const errorMessage = dbError?.message || '';
      const isConnectionError = 
        errorMessage.includes('No available servers') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Connection pool') ||
        errorMessage.includes('timeout');
      
      if (isConnectionError) {
        this.logger.error(`[LOGIN] Database connection error during user lookup: ${errorMessage}`);
        throw new UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
      }
      // Diğer hatalar için normal auth hatası olarak devam et
      this.logger.warn(`[LOGIN] User lookup error (treating as user not found): ${errorMessage}`);
      user = null;
    }

    if (!user) {
      // 🔒 GÜVENLİK: Tek bir güvenli mesaj (user enumeration önleme)
      // Frontend'de bu mesaj "E-posta adresi veya şifre hatalı." olarak gösterilecek
      this.logger.warn(`[LOGIN] User not found or password invalid for: ${loginIdentifier}`);
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    // 🗑️ Soft delete: 14 gün grace period – restore mümkün; sonrası kalıcı silinmiş
    if (user.isDeleted === true || user.deletedAt) {
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : null;
      const daysSinceDeleted = deletedAt ? (Date.now() - deletedAt.getTime()) / (24 * 60 * 60 * 1000) : Infinity;
      const RESTORE_GRACE_DAYS = 14;
      if (daysSinceDeleted > RESTORE_GRACE_DAYS) {
        this.logger.warn(`[LOGIN] Permanently deleted account: ${user.email || user.username}`);
        throw new UnauthorizedException('Hesap kalıcı olarak silinmiş.');
      }
      this.logger.log(`[LOGIN] Deleted account within grace period: ${user.email || user.username}, restore available`);
      return {
        status: 'DELETED_ACCOUNT',
        restoreAvailable: true,
        deletedAt: user.deletedAt,
        message: 'Hesabınız silinmiş. 14 gün içinde geri yükleyebilirsiniz.',
      };
    }

    // E-posta doğrulanmamışsa giriş engelle (yeni kayıtlar OTP ile doğrulanır).
    // Mevcut kullanıcıları kilitlememek için: prisma.user.updateMany({ where: { isVerified: false }, data: { isVerified: true } }) bir kez çalıştırılabilir.
    if (user.isVerified === false) {
      this.logger.warn(`[LOGIN] Email not verified for: ${user.email || user.username}`);
      throw new UnauthorizedException({
        message: 'Lütfen e-posta adresinizi doğrulayın. Size gönderilen kodu kullanın veya yeniden kod gönderin.',
        needsEmailVerification: true,
        email: user.email,
      });
    }

    this.logger.log(`[LOGIN] User found: ${user.email || user.username}, accountStatus: ${user.accountStatus || 'ACTIVE (default)'}`);

    // 🔥 3. Askıya alma kontrolü
    // ⚠️ accountStatus null ise ACTIVE kabul et (eski kullanıcılar için)
    if (user.accountStatus === 'SUSPENDED') {
      // Süre dolmuşsa otomatik aktif yap
      if (user.suspendedUntil && new Date(user.suspendedUntil) < new Date()) {
        this.logger.log(`[LOGIN] Suspension expired, activating account for: ${user.email || user.username}`);
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            accountStatus: 'ACTIVE',
            suspendedAt: null,
            suspendedUntil: null,
            suspensionReason: null,
            suspensionNote: null,
            suspendedByAdminId: null,
          },
        });
        // Aktif hale geldi, devam et
      } else {
        // Hala askıda, giriş yapılamaz
        // 🔒 403 Forbidden kullan (401 Unauthorized değil - kullanıcı doğru ama yetkisi yok)
        this.logger.warn(`[LOGIN] Account suspended for: ${user.email || user.username}, reason: ${user.suspensionReason || 'Belirtilmemiş'}`);
        throw new ForbiddenException({
          code: 'ACCOUNT_SUSPENDED',
          message: 'Hesabınız askıya alınmıştır. Giriş yapamazsınız.',
          reason: user.suspensionReason || 'Belirtilmemiş',
          until: user.suspendedUntil || null,
        });
      }
    }

    // 🔥 4. Token oluşturma
    let tokens;
    try {
      tokens = await this.generateTokens(user.id);
    } catch (tokenError: any) {
      const errorMessage = tokenError?.message || '';
      const isConnectionError = 
        errorMessage.includes('No available servers') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Connection pool') ||
        errorMessage.includes('timeout');
      
      if (isConnectionError) {
        this.logger.error(`[LOGIN] Database connection error during token generation: ${errorMessage}`);
        throw new UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
      }
      throw tokenError;
    }

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

    if (user.isDeleted === true || user.deletedAt) {
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : null;
      const daysSinceDeleted = deletedAt ? (Date.now() - deletedAt.getTime()) / (24 * 60 * 60 * 1000) : Infinity;
      const RESTORE_GRACE_DAYS = 14;
      if (daysSinceDeleted > RESTORE_GRACE_DAYS) {
        throw new UnauthorizedException('Hesap kalıcı olarak silinmiş.');
      }
      return {
        status: 'DELETED_ACCOUNT',
        restoreAvailable: true,
        deletedAt: user.deletedAt,
        message: 'Hesabınız silinmiş. 14 gün içinde geri yükleyebilirsiniz.',
      };
    }

    if (user.isVerified === false) {
      throw new UnauthorizedException({
        message: 'Lütfen e-posta adresinizi doğrulayın. Size gönderilen kodu kullanın veya yeniden kod gönderin.',
        needsEmailVerification: true,
        email: user.email,
      });
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

  async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$connect();
      await this.prisma.user.findFirst({ select: { id: true }, take: 1 });
      return true;
    } catch {
      return false;
    }
  }

  private static readonly RESTORE_GRACE_DAYS = 14;

  async restoreAccount(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto);
    if (!user) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (user.isDeleted !== true && !user.deletedAt) {
      throw new BadRequestException('Hesap zaten aktif.');
    }
    const deletedAt = user.deletedAt ? new Date(user.deletedAt) : null;
    const daysSinceDeleted = deletedAt ? (Date.now() - deletedAt.getTime()) / (24 * 60 * 60 * 1000) : Infinity;
    if (daysSinceDeleted > AuthService.RESTORE_GRACE_DAYS) {
      throw new UnauthorizedException('Hesap kalıcı olarak silinmiş. Geri yükleme süresi doldu.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        accountStatus: 'ACTIVE',
      },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    const tokens = await this.generateTokens(user.id);
    const { password: _, ...userWithoutPassword } = user;
    const payload = this.hydrateAuthUser({
      ...userWithoutPassword,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      accountStatus: 'ACTIVE',
    });
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
    // 🔥 Connection string'de readPreference=primary yapıldı, transaction gerekmez
    // ✅ MongoDB timeout hatalarını yakalamak için try-catch
    try {
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt,
        },
      });
    } catch (error: any) {
      // MongoDB connection timeout hatası
      if (error.message?.includes('timeout') || error.message?.includes('Connection pool')) {
        this.logger.error(`MongoDB connection timeout in generateTokens: ${error.message}`);
        throw new UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
      }
      throw error;
    }

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
      // 🔒 GÜVENLİK: Tek bir güvenli mesaj (user enumeration önleme)
      // Frontend'de bu mesaj "E-posta adresi veya şifre hatalı." olarak gösterilecek
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isDeleted === true || user.deletedAt) {
      const deletedAt = user.deletedAt ? new Date(user.deletedAt) : null;
      const daysSinceDeleted = deletedAt ? (Date.now() - deletedAt.getTime()) / (24 * 60 * 60 * 1000) : Infinity;
      const RESTORE_GRACE_DAYS = 14;
      if (daysSinceDeleted > RESTORE_GRACE_DAYS) {
        throw new UnauthorizedException('Hesap kalıcı olarak silinmiş.');
      }
      return {
        status: 'DELETED_ACCOUNT',
        restoreAvailable: true,
        deletedAt: user.deletedAt,
        message: 'Hesabınız silinmiş. 14 gün içinde geri yükleyebilirsiniz.',
      };
    }

    if (user.isVerified === false) {
      throw new UnauthorizedException({
        message: 'Lütfen e-posta adresinizi doğrulayın. Size gönderilen kodu kullanın veya yeniden kod gönderin.',
        needsEmailVerification: true,
        email: user.email,
      });
    }

    let reactivated = false;

    // 🔒 Hesap askıya alınmışsa giriş yapılamaz
    // ⚠️ accountStatus null ise ACTIVE kabul et (eski kullanıcılar için)
    if (user.accountStatus === 'SUSPENDED') {
      // Süre dolmuşsa otomatik aktif yap
      if (user.suspendedUntil && new Date(user.suspendedUntil) < new Date()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            accountStatus: 'ACTIVE',
            suspendedAt: null,
            suspendedUntil: null,
            suspensionReason: null,
            suspensionNote: null,
            suspendedByAdminId: null,
          },
        });
        // Aktif hale geldi, devam et
      } else {
        // Hala askıda, giriş yapılamaz
        // 🔒 403 Forbidden kullan (401 Unauthorized değil - kullanıcı doğru ama yetkisi yok)
        this.logger.warn(`[LOGIN] Account suspended for: ${user.email || user.username}, reason: ${user.suspensionReason || 'Belirtilmemiş'}`);
        throw new ForbiddenException({
          code: 'ACCOUNT_SUSPENDED',
          message: 'Hesabınız askıya alınmıştır. Giriş yapamazsınız.',
          reason: user.suspensionReason || 'Belirtilmemiş',
          until: user.suspendedUntil || null,
        });
      }
    }

    // 🔒 PENDING_DELETION: 15 gün içinde girişle hesap yeniden aktifleşir; süre dolmuşsa kalıcı silinmiş sayılır
    if (user.accountStatus === 'PENDING_DELETION') {
      const now = new Date();
      const scheduledAt = user.scheduledDeletionAt ? new Date(user.scheduledDeletionAt) : null;
      if (scheduledAt && scheduledAt > now) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            accountStatus: 'ACTIVE',
            deletionRequestedAt: null,
            scheduledDeletionAt: null,
          },
        });
        this.logger.log(`[LOGIN] Account reactivated (was pending deletion): ${user.email || user.username}`);
        reactivated = true;
      } else {
        this.logger.warn(`[LOGIN] Account permanently deleted (grace period expired): ${user.email || user.username}`);
        throw new ForbiddenException({
          code: 'ACCOUNT_PERMANENTLY_DELETED',
          message: 'Bu hesap kalıcı olarak silinmiştir.',
        });
      }
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
      ...(reactivated && { reactivated: true }),
    };
  }

  async validateUser(loginDto: LoginDto, options?: { requireCorporate?: boolean }) {
    const { password } = loginDto;
    if (!password) {
      this.logger.warn('validateUser: No password provided');
      return null;
    }

    // ✅ Önce orijinal case ile arama yap (daha hızlı)
    const emailOrUsername = loginDto.emailOrUsername?.trim();
    const email = loginDto.email?.trim();
    const username = loginDto.username?.trim();

    // Arama kriteri belirle (önce orijinal case)
    const searchTerm = emailOrUsername || email || username;
    if (!searchTerm) {
      this.logger.warn('validateUser: No search term provided (emailOrUsername, email, or username)');
      return null;
    }

    this.logger.log(`[LOGIN DEBUG] 🔍 Searching for user with term: ${searchTerm.substring(0, 3)}***`);

    // ✅ Case-insensitive arama: Hem orijinal hem lowercase ile dene
    // MongoDB'de mode: 'insensitive' çalışmıyor, bu yüzden manuel olarak deniyoruz
    let userByEmail, userByUsername;
    try {
      // Önce orijinal case ile email dene
      userByEmail = await this.prisma.user.findUnique({
        where: { email: searchTerm },
        select: {
          id: true,
          username: true,
          email: true,
          password: true,
          roles: true,
          plan: true,
          badges: true,
          isAdmin: true,
          superAdmin: true,
          accountStatus: true,
          suspendedUntil: true,
          suspensionReason: true,
          scheduledDeletionAt: true,
          isVerified: true,
          isDeleted: true,
          deletedAt: true,
        },
      });
      
      // Orijinal case ile bulunamazsa lowercase ile dene
      if (!userByEmail) {
        userByEmail = await this.prisma.user.findUnique({
          where: { email: searchTerm.toLowerCase().trim() },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            roles: true,
            plan: true,
            badges: true,
            isAdmin: true,
            superAdmin: true,
            accountStatus: true,
            suspendedUntil: true,
            suspensionReason: true,
            scheduledDeletionAt: true,
            isVerified: true,
            isDeleted: true,
            deletedAt: true,
          },
        });
      }
      
      // Email ile bulunamazsa username ile dene (önce orijinal, sonra lowercase)
      if (!userByEmail) {
        userByUsername = await this.prisma.user.findUnique({
          where: { username: searchTerm },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            roles: true,
            plan: true,
            badges: true,
            isAdmin: true,
            superAdmin: true,
            accountStatus: true,
            suspendedUntil: true,
            suspensionReason: true,
            scheduledDeletionAt: true,
            isVerified: true,
            isDeleted: true,
            deletedAt: true,
          },
        });
        
        if (!userByUsername) {
          userByUsername = await this.prisma.user.findUnique({
            where: { username: searchTerm.toLowerCase().trim() },
            select: {
              id: true,
              username: true,
              email: true,
              password: true,
              roles: true,
              plan: true,
              badges: true,
              isAdmin: true,
              superAdmin: true,
              accountStatus: true,
              suspendedUntil: true,
              suspensionReason: true,
              scheduledDeletionAt: true,
              isVerified: true,
              isDeleted: true,
              deletedAt: true,
            },
          });
        }
      }
    } catch (error: any) {
      // Tüm hataları log'la ama kullanıcı bulunamadı olarak işle
      const errorMessage = error?.message || '';
      this.logger.error(`validateUser query error: ${errorMessage}`);
      this.logger.error(`Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      // Hata olsa bile null dön (kullanıcı bulunamadı olarak işle)
      return null;
    }

    let user = userByEmail || userByUsername;

    if (user) {
      this.logger.log(`[LOGIN DEBUG] ✅ User found by ${userByEmail ? 'email' : 'username'}: ${user.email || user.username}`);
    } else {
      this.logger.warn(`[LOGIN DEBUG] ❌ User not found: ${searchTerm}`);
    }

    // ✅ Case-insensitive arama zaten yukarıda yapıldı, burada fallback gerekmez

    if (!user) {
      this.logger.warn(`validateUser: User not found after all search attempts: ${searchTerm}`);
      return null;
    }

    // ✅ User bulundu, devam et

    // Corporate kontrolü
    if (options?.requireCorporate) {
      const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
      const hasCorporateRole = roles.includes('corporate');
      if (!hasCorporateRole) {
        return null;
      }
    }

    // Şifre doğrulama
    this.logger.log(`[LOGIN DEBUG] 🔐 Verifying password for: ${user.email || user.username}`);
    this.logger.log(`[LOGIN DEBUG] Password length: ${password?.length || 0}`);
    this.logger.log(`[LOGIN DEBUG] Hash exists: ${!!user.password}, hash type: ${user.password?.startsWith('$2') ? 'bcrypt' : 'other'}`);
    
    try {
      const passwordValid = await this.verifyAndMigratePassword(password, user);
      
      if (!passwordValid) {
        this.logger.warn(`[LOGIN DEBUG] ❌ Password validation FAILED for: ${user.email || user.username}`);
        return null;
      }
      
      this.logger.log(`[LOGIN DEBUG] ✅ Password validation SUCCESS for: ${user.email || user.username}`);
    } catch (error: any) {
      this.logger.error(`[LOGIN DEBUG] ⚠️ Password verification error: ${error?.message}`);
      return null;
    }

    // ✅ Debug: Kullanıcı başarıyla doğrulandı
    this.logger.log(`User validated successfully: ${user.email || user.username}`);
    return user;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.authSelect,
        accountStatus: true,
        isDeleted: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isDeleted === true || user.accountStatus === 'PENDING_DELETION') {
      throw new UnauthorizedException('ACCOUNT_PENDING_DELETION');
    }

    if (user.accountStatus === 'SUSPENDED') {
      throw new ForbiddenException('ACCOUNT_SUSPENDED');
    }

    const { accountStatus: _, isDeleted: __, ...safeUser } = user;
    return this.hydrateAuthUser(safeUser);
  }

  private async verifyAndMigratePassword(
    plainPassword: string,
    user: { id: string; password: string },
  ): Promise<boolean> {
    const storedHash = user.password;

    if (!storedHash) {
      this.logger.warn(`User ${user.id} has no password hash`);
      return false;
    }

    this.logger.log(`verifyAndMigratePassword: Hash type check - starts with $2: ${storedHash.startsWith('$2')}, length: ${storedHash.length}`);

    // 1) Modern bcrypt hash (yeni kayıtlar)
    if (storedHash.startsWith('$2')) {
      try {
        const isValid = await bcrypt.compare(plainPassword, storedHash);
        this.logger.log(`verifyAndMigratePassword: Bcrypt compare result: ${isValid}`);
        if (!isValid) {
          this.logger.warn(`Bcrypt password comparison failed for user ${user.id}`);
        }
        return isValid;
      } catch (error: any) {
        this.logger.error(`Bcrypt compare error for user ${user.id}: ${error.message}`);
        return false;
      }
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
    const normalized = email.trim().toLowerCase();
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      if (!user) {
        return { message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, doğrulama kodu e-posta adresinize gönderildi.' };
      }
      const { code, expiresAt } = await this.otpService.createOtp(normalized, OtpPurpose.password_reset);
      await this.mailService.sendPasswordResetOtpMail(normalized, code);
      this.logger.log(`✅ Password reset OTP sent to ${normalized}`);
      return {
        message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, doğrulama kodu e-posta adresinize gönderildi.',
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`forgotPassword for ${normalized}:`, error?.message || error);
      return { message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, doğrulama kodu e-posta adresinize gönderildi.' };
    }
  }

  async verifyResetOtp(email: string, code: string) {
    const normalized = email.trim().toLowerCase();
    await this.otpService.verifyOtp(normalized, OtpPurpose.password_reset, code);
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: normalized, purpose: 'password_reset' },
      { expiresIn: '15m' },
    );
    return { resetToken };
  }

  async resetPasswordWithOtp(resetToken: string, newPassword: string) {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = this.jwtService.verify(resetToken);
    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş bağlantı. Lütfen şifre sıfırlama adımlarını tekrarlayın.');
    }
    if (payload.purpose !== 'password_reset' || !payload.sub) {
      throw new UnauthorizedException('Geçersiz bağlantı.');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { password: hashedPassword },
    });
    return { message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.' };
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

  async changePassword(userId: string, dto: ChangePasswordDto, requestMeta?: { ip?: string; userAgent?: string }) {
    const { currentPassword, newPassword } = dto;

    // Kullanıcıyı şifre ile birlikte getir
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    // Mevcut şifreyi doğrula
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Mevcut şifreniz doğrulanamadı.');
    }

    // Yeni şifre eski şifreyle aynı olamaz
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('Yeni şifre eski şifreyle aynı olamaz.');
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Şifreyi güncelle
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    this.logger.log(`✅ Password changed for user: ${userId}`);

    // ✅ Güvenlik bildirimi e-postası gönder (ZORUNLU - güvenlik için kritik)
    this.logger.log(`📧 [PASSWORD CHANGE] Starting mail send process for user: ${userId}`);
    
    try {
      // 1️⃣ Kullanıcı bilgilerini al
      const userWithEmail = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          fullName: true,
        },
      });

      if (!userWithEmail) {
        this.logger.error(`❌ [PASSWORD CHANGE] User not found for userId: ${userId}`);
        throw new Error('User not found for email');
      }

      if (!userWithEmail.email) {
        this.logger.error(`❌ [PASSWORD CHANGE] User email is missing for userId: ${userId}`);
        throw new Error('User email is missing');
      }

      this.logger.log(`📧 [PASSWORD CHANGE] Sending password change mail to: ${userWithEmail.email}`);

      // 2️⃣ Mail servisi kontrolü
      if (!this.mailService) {
        this.logger.error(`❌ [PASSWORD CHANGE] MailService is not injected! This is a critical error.`);
        throw new Error('MailService is not available');
      }

      // 3️⃣ Tarih/saat formatla
      const now = new Date();
      const dateTime = now.toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // 4️⃣ IP'yi maskele (son 2 okteti gizle)
      let ipMasked: string | undefined;
      if (requestMeta?.ip) {
        const ipParts = requestMeta.ip.split('.');
        if (ipParts.length === 4) {
          ipMasked = `${ipParts[0]}.${ipParts[1]}.x.x`;
        } else {
          ipMasked = requestMeta.ip; // IPv6 veya farklı format
        }
      }

      this.logger.log(`📧 [PASSWORD CHANGE] Mail params: email=${userWithEmail.email}, dateTime=${dateTime}, ipMasked=${ipMasked || 'N/A'}`);

      // 5️⃣ Mail gönder
      await this.mailService.sendPasswordChangedMail({
        to: userWithEmail.email,
        name: userWithEmail.fullName || 'Kullanıcı',
        dateTime,
        device: requestMeta?.userAgent || undefined,
        ipMasked,
      });

      this.logger.log(`✅ [PASSWORD CHANGE] Password change mail sent successfully to: ${userWithEmail.email}`);
    } catch (mailError: any) {
      // 🔴 KRİTİK: Mail gönderilemezse detaylı log
      this.logger.error(`❌ [PASSWORD CHANGE] CRITICAL: Failed to send password changed email to user ${userId}`);
      this.logger.error(`❌ [PASSWORD CHANGE] Error details:`, {
        error: mailError?.message || String(mailError),
        stack: mailError?.stack,
        userId,
        email: mailError?.email || 'unknown',
      });
      
      // ⚠️ Güvenlik notu: Mail gönderilemezse bile şifre değişikliği başarılı kalmalı
      // Ama bu durum mutlaka loglanmalı ve izlenmeli
      // Production'da bu loglar alert sistemine bağlanmalı
    }

    return { message: 'Şifreniz başarıyla güncellendi.' };
  }
}


