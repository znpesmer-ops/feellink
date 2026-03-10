"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const search_service_1 = require("../search/search.service");
const library_1 = require("@prisma/client/runtime/library");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const roles_utils_1 = require("../roles/roles.utils");
const dashboard_features_1 = require("../dashboard/dashboard.features");
const users_service_1 = require("../users/users.service");
const mail_service_1 = require("../mail/mail.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, configService, searchService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.searchService = searchService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.authSelect = {
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
            superAdmin: true,
            profileCompleted: true,
            createdAt: true,
        };
    }
    hydrateAuthUser(user) {
        if (!user) {
            throw new common_1.UnauthorizedException('User data not found');
        }
        const plan = user.plan ?? 'FREE';
        const roles = (0, roles_utils_1.normalizeRoles)(user.roles);
        const badgeIds = Array.isArray(user.badges) ? user.badges : [];
        const isAdmin = user.isAdmin === true || user.superAdmin === true;
        let capabilities = (0, roles_utils_1.computeCapabilities)(roles, plan, badgeIds);
        if (isAdmin) {
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
                    eventLimitMonthly: null,
                    artworkLimitMonthly: null,
                    eventCooldownMonths: null,
                },
            };
        }
        const primaryRole = roles.length > 0 ? roles[0] : 'art_lover';
        const dashboard = (0, dashboard_features_1.getDashboardSnapshot)(primaryRole, plan);
        const sidebar = (0, roles_utils_1.getSidebarVisibility)(capabilities);
        const getActiveRole = (roles, isAdmin) => {
            if (isAdmin) {
                return 'Admin';
            }
            if (!roles || roles.length === 0) {
                return null;
            }
            const rolePriority = {
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
            const roleLabels = {
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
                extras: user.extras ?? [],
                plan: capabilities.plan,
                badges: badgeIds,
                isPrivate: user.isPrivate ?? false,
                isVerified: user.isVerified ?? false,
                isAdmin: user.isAdmin ?? false,
                superAdmin: user.superAdmin ?? false,
                createdAt: user.createdAt ?? new Date(),
                activeRole: activeRole || null,
            },
            capabilities,
            dashboard,
            sidebar,
        };
    }
    async register(registerDto) {
        const { email, username, password, fullName, role, termsAccepted } = registerDto;
        if (termsAccepted !== true) {
            throw new common_1.BadRequestException('Kullanıcı sözleşmesi kabul edilmeden kayıt olunamaz.');
        }
        try {
            this.logger.log(`[REGISTER DEBUG] Starting registration for: ${email}`);
            this.logger.log(`[REGISTER DEBUG] Username: ${username}, FullName: ${fullName || 'N/A'}`);
            const hashedPassword = await bcrypt.hash(password, 10);
            this.logger.log(`[REGISTER DEBUG] Password hashed successfully`);
            const initialRoles = role && (0, roles_utils_1.isValidRole)(role) ? [role] : [];
            this.logger.log(`[REGISTER DEBUG] Initial roles: ${JSON.stringify(initialRoles)}`);
            const user = await this.prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    fullName,
                    roles: initialRoles,
                    plan: 'FREE',
                    badges: [],
                    termsAccepted: true,
                    termsAcceptedAt: new Date(),
                },
                select: {
                    ...this.authSelect,
                },
            });
            this.logger.log(`[REGISTER DEBUG] User created successfully: ${user.id}`);
            const tokens = await this.generateTokens(user.id);
            this.logger.log(`[REGISTER DEBUG] Tokens generated`);
            try {
                await this.searchService.indexUser(user);
                this.logger.log(`[REGISTER DEBUG] User indexed in Meilisearch`);
            }
            catch (error) {
                this.logger.warn(`[REGISTER DEBUG] Error indexing new user (non-critical): ${error instanceof Error ? error.message : error}`);
            }
            const payload = this.hydrateAuthUser(user);
            const needsRoleSelection = (user.roles?.length ?? 0) === 0;
            this.logger.log(`[REGISTER DEBUG] Registration successful for: ${email}`);
            return {
                ...payload,
                ...tokens,
                needsRoleSelection,
            };
        }
        catch (err) {
            if (err instanceof library_1.PrismaClientKnownRequestError && err.code === 'P2002') {
                const target = err.meta?.target || [];
                this.logger.warn(`[REGISTER DEBUG] Unique constraint violation: ${JSON.stringify(target)}`);
                if (target.includes('email')) {
                    throw new common_1.ConflictException('Bu e-posta adresi zaten kullanımda');
                }
                if (target.includes('username')) {
                    throw new common_1.ConflictException('Bu kullanıcı adı zaten kullanımda');
                }
                throw new common_1.ConflictException('Bu bilgilerle kayıtlı bir kullanıcı zaten var');
            }
            this.logger.error(`[REGISTER DEBUG] Registration error for ${email}:`, err);
            this.logger.error(`[REGISTER DEBUG] Error details:`, {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
                code: err instanceof library_1.PrismaClientKnownRequestError ? err.code : undefined,
            });
            throw new common_1.BadRequestException('Kayıt işlemi sırasında bir hata oluştu');
        }
    }
    async login(loginDto) {
        const loginIdentifier = loginDto.emailOrUsername || loginDto.email || loginDto.username;
        this.logger.log(`[LOGIN] Login attempt for: ${loginIdentifier}`);
        let user;
        try {
            user = await this.validateUser(loginDto);
        }
        catch (dbError) {
            const errorMessage = dbError?.message || '';
            const isConnectionError = errorMessage.includes('No available servers') ||
                errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('Connection pool') ||
                errorMessage.includes('timeout');
            if (isConnectionError) {
                this.logger.error(`[LOGIN] Database connection error during user lookup: ${errorMessage}`);
                throw new common_1.UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
            }
            this.logger.warn(`[LOGIN] User lookup error (treating as user not found): ${errorMessage}`);
            user = null;
        }
        if (!user) {
            this.logger.warn(`[LOGIN] User not found or password invalid for: ${loginIdentifier}`);
            throw new common_1.UnauthorizedException('E-posta veya şifre hatalı');
        }
        this.logger.log(`[LOGIN] User found: ${user.email || user.username}, accountStatus: ${user.accountStatus || 'ACTIVE (default)'}`);
        if (user.accountStatus === 'SUSPENDED') {
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
            }
            else {
                this.logger.warn(`[LOGIN] Account suspended for: ${user.email || user.username}, reason: ${user.suspensionReason || 'Belirtilmemiş'}`);
                throw new common_1.ForbiddenException({
                    code: 'ACCOUNT_SUSPENDED',
                    message: 'Hesabınız askıya alınmıştır. Giriş yapamazsınız.',
                    reason: user.suspensionReason || 'Belirtilmemiş',
                    until: user.suspendedUntil || null,
                });
            }
        }
        let tokens;
        try {
            tokens = await this.generateTokens(user.id);
        }
        catch (tokenError) {
            const errorMessage = tokenError?.message || '';
            const isConnectionError = errorMessage.includes('No available servers') ||
                errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('Connection pool') ||
                errorMessage.includes('timeout');
            if (isConnectionError) {
                this.logger.error(`[LOGIN] Database connection error during token generation: ${errorMessage}`);
                throw new common_1.UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
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
    async corporateLogin(loginDto) {
        const user = await this.validateUser(loginDto, { requireCorporate: true });
        if (!user) {
            throw new common_1.UnauthorizedException('Kurumsal hesap bulunamadı veya yetkisiz.');
        }
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
    async generateTokens(userId) {
        const accessToken = this.jwtService.sign({ userId }, {
            expiresIn: '15m',
        });
        const refreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        try {
            await this.prisma.refreshToken.create({
                data: {
                    token: refreshToken,
                    userId,
                    expiresAt,
                },
            });
        }
        catch (error) {
            if (error.message?.includes('timeout') || error.message?.includes('Connection pool')) {
                this.logger.error(`MongoDB connection timeout in generateTokens: ${error.message}`);
                throw new common_1.UnauthorizedException('Veritabanı bağlantı hatası. Lütfen tekrar deneyin.');
            }
            throw error;
        }
        return {
            accessToken,
            refreshToken,
        };
    }
    async refreshTokens(refreshToken) {
        const tokenData = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!tokenData) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (tokenData.expiresAt < new Date()) {
            await this.prisma.refreshToken.delete({
                where: { id: tokenData.id },
            });
            throw new common_1.UnauthorizedException('Refresh token expired');
        }
        await this.prisma.refreshToken.delete({
            where: { id: tokenData.id },
        });
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
    async logout(refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
        return { message: 'Logged out successfully' };
    }
    async logoutAll(userId) {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
        return { message: 'Logged out from all devices' };
    }
    async loginUnified(loginDto) {
        const user = await this.validateUser(loginDto);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.accountStatus === 'SUSPENDED') {
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
            }
            else {
                this.logger.warn(`[LOGIN] Account suspended for: ${user.email || user.username}, reason: ${user.suspensionReason || 'Belirtilmemiş'}`);
                throw new common_1.ForbiddenException({
                    code: 'ACCOUNT_SUSPENDED',
                    message: 'Hesabınız askıya alınmıştır. Giriş yapamazsınız.',
                    reason: user.suspensionReason || 'Belirtilmemiş',
                    until: user.suspendedUntil || null,
                });
            }
        }
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
    async validateUser(loginDto, options) {
        const { password } = loginDto;
        if (!password) {
            this.logger.warn('validateUser: No password provided');
            return null;
        }
        const emailOrUsername = loginDto.emailOrUsername?.trim();
        const email = loginDto.email?.trim();
        const username = loginDto.username?.trim();
        const searchTerm = emailOrUsername || email || username;
        if (!searchTerm) {
            this.logger.warn('validateUser: No search term provided (emailOrUsername, email, or username)');
            return null;
        }
        this.logger.log(`[LOGIN DEBUG] 🔍 Searching for user with term: ${searchTerm.substring(0, 3)}***`);
        let userByEmail, userByUsername;
        try {
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
                },
            });
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
                    },
                });
            }
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
                        },
                    });
                }
            }
        }
        catch (error) {
            const errorMessage = error?.message || '';
            this.logger.error(`validateUser query error: ${errorMessage}`);
            this.logger.error(`Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
            return null;
        }
        let user = userByEmail || userByUsername;
        if (user) {
            this.logger.log(`[LOGIN DEBUG] ✅ User found by ${userByEmail ? 'email' : 'username'}: ${user.email || user.username}`);
        }
        else {
            this.logger.warn(`[LOGIN DEBUG] ❌ User not found: ${searchTerm}`);
        }
        if (!user) {
            this.logger.warn(`validateUser: User not found after all search attempts: ${searchTerm}`);
            return null;
        }
        if (options?.requireCorporate) {
            const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
            const hasCorporateRole = roles.includes('corporate');
            if (!hasCorporateRole) {
                return null;
            }
        }
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
        }
        catch (error) {
            this.logger.error(`[LOGIN DEBUG] ⚠️ Password verification error: ${error?.message}`);
            return null;
        }
        this.logger.log(`User validated successfully: ${user.email || user.username}`);
        return user;
    }
    async getUserProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                ...this.authSelect,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.hydrateAuthUser(user);
    }
    async verifyAndMigratePassword(plainPassword, user) {
        const storedHash = user.password;
        if (!storedHash) {
            this.logger.warn(`User ${user.id} has no password hash`);
            return false;
        }
        this.logger.log(`verifyAndMigratePassword: Hash type check - starts with $2: ${storedHash.startsWith('$2')}, length: ${storedHash.length}`);
        if (storedHash.startsWith('$2')) {
            try {
                const isValid = await bcrypt.compare(plainPassword, storedHash);
                this.logger.log(`verifyAndMigratePassword: Bcrypt compare result: ${isValid}`);
                if (!isValid) {
                    this.logger.warn(`Bcrypt password comparison failed for user ${user.id}`);
                }
                return isValid;
            }
            catch (error) {
                this.logger.error(`Bcrypt compare error for user ${user.id}: ${error.message}`);
                return false;
            }
        }
        if (storedHash.length === 40) {
            const legacySalt = storedHash.slice(0, 22);
            const saltString = `$2b$10$${legacySalt}`;
            try {
                const computedHash = await bcrypt.hash(plainPassword, saltString);
                const legacyComputed = legacySalt + computedHash.slice(-18);
                if (legacyComputed === storedHash) {
                    try {
                        const newHash = await bcrypt.hash(plainPassword, 10);
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: { password: newHash },
                        });
                    }
                    catch (rehashError) {
                        this.logger.warn(`Legacy password migration failed for user ${user.id}: ${rehashError instanceof Error ? rehashError.message : rehashError}`);
                    }
                    return true;
                }
            }
            catch (legacyError) {
                this.logger.warn(`Legacy password check failed for user ${user.id}: ${legacyError instanceof Error ? legacyError.message : legacyError}`);
                return false;
            }
        }
        if (storedHash === plainPassword) {
            try {
                const newHash = await bcrypt.hash(plainPassword, 10);
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { password: newHash },
                });
            }
            catch (rehashError) {
                this.logger.warn(`Plain-text password migration failed for user ${user.id}: ${rehashError instanceof Error ? rehashError.message : rehashError}`);
            }
            return true;
        }
        return false;
    }
    buildLoginWhereClause(loginDto, options) {
        const normalize = (value) => value?.trim();
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
            throw new common_1.UnauthorizedException('E-posta veya kullanıcı adı gerekli');
        }
        const whereClause = {
            OR: ors,
        };
        if (options?.requireCorporate) {
            whereClause.roles = { has: 'corporate' };
        }
        return whereClause;
    }
    async setUserRole(userId, role) {
        const legacyToNew = {
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
            throw new common_1.UnauthorizedException('Invalid role');
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
            throw new common_1.NotFoundException('User not found');
        }
        const mergedRoles = (0, roles_utils_1.ensureRoleAssignment)([mapped]);
        const plan = existing.plan ?? 'FREE';
        const extras = Array.isArray(existing.extras) ? existing.extras : [];
        const nextBadges = (0, users_service_1.getBadgesFromSelection)(mergedRoles, plan, extras);
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
        }
        catch (error) {
            console.error('Error updating user in search index:', error);
        }
        return this.hydrateAuthUser(updated);
    }
    createPasswordResetToken() {
        const resetToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const hashedToken = (0, crypto_1.createHash)('sha256').update(resetToken).digest('hex');
        return { resetToken, hashedToken };
    }
    async forgotPassword(dto) {
        const { email } = dto;
        try {
            const user = await this.prisma.user.findUnique({
                where: { email },
            });
            const isDevelopment = process.env.NODE_ENV !== 'production';
            if (!user) {
                if (isDevelopment) {
                    return {
                        message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı gönderildi.',
                    };
                }
                return { message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı gönderildi.' };
            }
            const { resetToken, hashedToken } = this.createPasswordResetToken();
            const expires = new Date();
            expires.setHours(expires.getHours() + 1);
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: hashedToken,
                    passwordResetExpires: expires,
                },
            });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
            const mailMode = process.env.MAIL_MODE || 'dev';
            let mailSent = false;
            let mailError = null;
            if (mailMode === 'prod') {
                try {
                    await this.mailService.sendPasswordResetMail(email, resetUrl);
                    this.logger.log(`✅ Password reset email sent successfully to ${email}`);
                    mailSent = true;
                }
                catch (error) {
                    mailError = error;
                    this.logger.error(`❌ Failed to send password reset email to ${email}:`, error.message || error);
                    if (error.code === 'EAUTH' || error.responseCode === 535) {
                        this.logger.error('🔴 SMTP kimlik doğrulama hatası!');
                        this.logger.error('Lütfen backend/.env dosyasındaki SMTP ayarlarını kontrol edin:');
                        this.logger.error('- SMTP_USER: Tam e-posta adresi (örn: info@feellink.io)');
                        this.logger.error('- SMTP_PASS: Gmail App Password (normal şifre değil!)');
                        this.logger.error('- Gmail için: https://myaccount.google.com/apppasswords adresinden App Password oluşturun');
                    }
                }
            }
            else {
                this.logger.log(`[DEV] Mail gönderimi atlandı (MAIL_MODE=${mailMode})`);
                this.logger.log(`[DEV] Reset URL for ${email}: ${resetUrl}`);
                mailSent = false;
            }
            if (mailMode !== 'prod') {
                this.logger.log(`[DEV] Reset URL for ${email}: ${resetUrl}`);
                this.logger.log(`[DEV] Reset Token: ${resetToken}`);
            }
            return {
                message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
            };
        }
        catch (error) {
            this.logger.error(`Database error in forgotPassword for ${email}:`, error);
            const isDevelopment = process.env.NODE_ENV !== 'production';
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            if (isDevelopment) {
                this.logger.warn(`[DEV] Database error in forgotPassword for ${email} - reset URL not shown to user`);
            }
            return {
                message: 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
            };
        }
    }
    async resetPassword(dto) {
        const { token, password } = dto;
        const hashedToken = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
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
            throw new common_1.UnauthorizedException('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.');
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
    async changePassword(userId, dto, requestMeta) {
        const { currentPassword, newPassword } = dto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                password: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            throw new common_1.UnauthorizedException('Mevcut şifreniz doğrulanamadı.');
        }
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new common_1.BadRequestException('Yeni şifre eski şifreyle aynı olamaz.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        this.logger.log(`✅ Password changed for user: ${userId}`);
        this.logger.log(`📧 [PASSWORD CHANGE] Starting mail send process for user: ${userId}`);
        try {
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
            if (!this.mailService) {
                this.logger.error(`❌ [PASSWORD CHANGE] MailService is not injected! This is a critical error.`);
                throw new Error('MailService is not available');
            }
            const now = new Date();
            const dateTime = now.toLocaleString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            let ipMasked;
            if (requestMeta?.ip) {
                const ipParts = requestMeta.ip.split('.');
                if (ipParts.length === 4) {
                    ipMasked = `${ipParts[0]}.${ipParts[1]}.x.x`;
                }
                else {
                    ipMasked = requestMeta.ip;
                }
            }
            this.logger.log(`📧 [PASSWORD CHANGE] Mail params: email=${userWithEmail.email}, dateTime=${dateTime}, ipMasked=${ipMasked || 'N/A'}`);
            await this.mailService.sendPasswordChangedMail({
                to: userWithEmail.email,
                name: userWithEmail.fullName || 'Kullanıcı',
                dateTime,
                device: requestMeta?.userAgent || undefined,
                ipMasked,
            });
            this.logger.log(`✅ [PASSWORD CHANGE] Password change mail sent successfully to: ${userWithEmail.email}`);
        }
        catch (mailError) {
            this.logger.error(`❌ [PASSWORD CHANGE] CRITICAL: Failed to send password changed email to user ${userId}`);
            this.logger.error(`❌ [PASSWORD CHANGE] Error details:`, {
                error: mailError?.message || String(mailError),
                stack: mailError?.stack,
                userId,
                email: mailError?.email || 'unknown',
            });
        }
        return { message: 'Şifreniz başarıyla güncellendi.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        search_service_1.SearchService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map