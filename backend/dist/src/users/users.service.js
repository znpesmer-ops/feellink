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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = exports.getBadgesFromSelection = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const roles_utils_1 = require("../roles/roles.utils");
const dashboard_features_1 = require("../dashboard/dashboard.features");
const cities_tr_1 = require("../constants/cities.tr");
const notifications_service_1 = require("../notifications/notifications.service");
const ROLE_BADGE_CODE_MAP = {
    art_lover: 'sanatsever',
    corporate: 'kurumsal',
    collector: 'koleksiyoner',
    artist: 'sanatci',
};
const EXTRA_BADGE_CODE_MAP = {
    collector: 'koleksiyoner-extra',
    koleksiyoner: 'koleksiyoner-extra',
    'koleksiyoner-extra': 'koleksiyoner-extra',
    koleksiyoner_extra: 'koleksiyoner-extra',
    collector_extra: 'koleksiyoner-extra',
    artist: 'sanatci-extra',
    sanatci: 'sanatci-extra',
    'sanatci-extra': 'sanatci-extra',
    sanatci_extra: 'sanatci-extra',
    artist_extra: 'sanatci-extra',
};
function mapExtrasForBadges(extras = []) {
    const mapped = extras
        .map((extra) => EXTRA_BADGE_CODE_MAP[extra])
        .filter((extra) => Boolean(extra));
    return Array.from(new Set(mapped));
}
function getBadgesFromSelection(roles, plan, extras = []) {
    const badgeRoles = roles.map((role) => ROLE_BADGE_CODE_MAP[role]).filter(Boolean);
    const extrasForBadges = mapExtrasForBadges(extras);
    const badges = [];
    if (badgeRoles.includes('sanatsever')) {
        badges.push('sanatsever-pro');
    }
    if (badgeRoles.includes('kurumsal')) {
        badges.push('kurumsal-pro');
    }
    if (badgeRoles.includes('koleksiyoner')) {
        badges.push('koleksiyoner-ori');
    }
    if (badgeRoles.includes('koleksiyoner') && extrasForBadges.includes('koleksiyoner-extra')) {
        badges.push('koleksiyoner-extra');
    }
    if (badgeRoles.includes('sanatci')) {
        badges.push('sanatci-pro');
    }
    if (badgeRoles.includes('sanatci') && extrasForBadges.includes('sanatci-extra')) {
        badges.push('sanatci-extra');
    }
    return Array.from(new Set(badges));
}
exports.getBadgesFromSelection = getBadgesFromSelection;
const SMS_VERIFICATION_ENABLED = false;
let UsersService = class UsersService {
    constructor(prisma, configService, notificationsService) {
        this.prisma = prisma;
        this.configService = configService;
        this.notificationsService = notificationsService;
    }
    async getProfile(username, currentUserId) {
        try {
            if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
                throw new common_1.NotFoundException('Geçersiz kullanıcı adı.');
            }
            console.log('[getProfile] Starting profile lookup for:', username);
            let user = null;
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(username);
            console.log('[getProfile] Is ObjectId:', isObjectId, 'for username:', username);
            if (isObjectId) {
                try {
                    user = await this.prisma.user.findFirst({
                        where: { id: username },
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            bio: true,
                            avatar: true,
                            roles: true,
                            plan: true,
                            badges: true,
                            isPrivate: true,
                            isVerified: true,
                            isAdmin: true,
                            createdAt: true,
                            profileCompleted: true,
                            dateOfBirth: true,
                            country: true,
                            city: true,
                            gender: true,
                            showProfileColorSignature: true,
                            _count: {
                                select: {
                                    posts: true,
                                    followers: true,
                                    following: true,
                                },
                            },
                        },
                    });
                }
                catch (idError) {
                    user = null;
                }
            }
            if (!user) {
                const allUsers = await this.prisma.user.findMany({
                    select: {
                        id: true,
                        username: true,
                    },
                });
                const normalizedSearch = username.toLowerCase().trim();
                console.log('[getProfile] Searching for normalized username:', normalizedSearch);
                const foundUser = allUsers.find((u) => u.username?.toLowerCase().trim() === normalizedSearch);
                console.log('[getProfile] Found user:', foundUser ? foundUser.username : 'NOT FOUND');
                if (foundUser) {
                    console.log('[getProfile] Fetching full profile for ID:', foundUser.id);
                    user = await this.prisma.user.findFirst({
                        where: { id: foundUser.id },
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            bio: true,
                            avatar: true,
                            roles: true,
                            plan: true,
                            badges: true,
                            isPrivate: true,
                            isVerified: true,
                            isAdmin: true,
                            createdAt: true,
                            profileCompleted: true,
                            dateOfBirth: true,
                            country: true,
                            city: true,
                            gender: true,
                            showProfileColorSignature: true,
                            _count: {
                                select: {
                                    posts: true,
                                    followers: true,
                                    following: true,
                                },
                            },
                        },
                    });
                }
            }
            if (!user) {
                throw new common_1.NotFoundException('Kullanıcı bulunamadı. Lütfen kullanıcı adını kontrol edin.');
            }
            if (!user.id) {
                throw new common_1.NotFoundException('Kullanıcı kimliği geçersiz. Lütfen destek ekibiyle iletişime geçin.');
            }
            let isFollowing = false;
            let hasRequested = false;
            let isOwnProfile = false;
            if (currentUserId && currentUserId === user.id) {
                isOwnProfile = true;
            }
            else if (currentUserId) {
                const isBlocked = await this.prisma.block.findFirst({
                    where: {
                        OR: [
                            { blockerId: currentUserId, blockedId: user.id },
                            { blockerId: user.id, blockedId: currentUserId },
                        ],
                    },
                });
                if (isBlocked) {
                    throw new common_1.ForbiddenException('Cannot access this profile');
                }
                const follow = await this.prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: currentUserId,
                            followingId: user.id,
                        },
                    },
                });
                isFollowing = !!follow;
                const request = await this.prisma.followRequest.findUnique({
                    where: {
                        requesterId_requestedId: {
                            requesterId: currentUserId,
                            requestedId: user.id,
                        },
                    },
                });
                hasRequested = !!request;
            }
            let posts = [];
            const canViewPosts = isOwnProfile ||
                !user.isPrivate ||
                isFollowing ||
                !currentUserId;
            const [followerCount, followingCount, postsCount] = await Promise.all([
                this.prisma.follow.count({
                    where: { followingId: user.id },
                }),
                this.prisma.follow.count({
                    where: { followerId: user.id },
                }),
                this.prisma.post.count({
                    where: {
                        userId: user.id,
                        isDeleted: false,
                    },
                }),
            ]);
            const badgeIds = Array.isArray(user.badges) ? user.badges : [];
            const plan = user.plan ?? 'FREE';
            const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles, plan, badgeIds);
            const sidebar = (0, roles_utils_1.getSidebarVisibility)(capabilities);
            const getActiveRole = (roles, isAdmin) => {
                console.log('[getProfile] getActiveRole called with:', { roles, isAdmin });
                if (isAdmin) {
                    console.log('[getProfile] User is admin, returning "Admin"');
                    return 'Admin';
                }
                if (!roles || roles.length === 0) {
                    console.log('[getProfile] No roles found, returning null');
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
                console.log('[getProfile] Sorted roles:', sortedRoles);
                if (sortedRoles.length === 0) {
                    console.log('[getProfile] No valid roles after filtering, returning null');
                    return null;
                }
                const activeRoleCode = sortedRoles[0];
                const roleLabels = {
                    art_lover: 'Sanatsever',
                    corporate: 'Kurum',
                    collector: 'Koleksiyoner',
                    artist: 'Sanatçı',
                };
                const result = roleLabels[activeRoleCode] || null;
                console.log('[getProfile] Active role result:', result);
                return result;
            };
            const userIsAdmin = user.isAdmin === true;
            const activeRole = getActiveRole(user.roles, userIsAdmin);
            console.log('[getProfile] Final activeRole:', activeRole, 'for user:', {
                roles: user.roles,
                isAdmin: user.isAdmin,
                userIsAdmin,
            });
            const transformAvatarUrl = (avatar) => {
                if (!avatar)
                    return null;
                if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                    const baseUrl = this.configService.get('BASE_URL');
                    if (baseUrl && (avatar.includes('localhost') || avatar.includes('127.0.0.1'))) {
                        try {
                            const urlObj = new URL(avatar);
                            return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
                        }
                        catch {
                            return avatar;
                        }
                    }
                    return avatar;
                }
                const baseUrl = this.configService.get('BASE_URL');
                if (baseUrl) {
                    const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
                    return `${baseUrl}${cleanPath}`;
                }
                const backendPort = this.configService.get('PORT') || '3002';
                const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
                const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1'
                    ? '192.168.1.38'
                    : endpoint;
                const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
                return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
            };
            const transformedPosts = posts.map((post) => ({
                ...post,
                media: post.media?.map((m) => {
                    if (!m.url)
                        return m;
                    if (m.url.startsWith('http://') || m.url.startsWith('https://')) {
                        const baseUrl = this.configService.get('BASE_URL');
                        if (baseUrl && (m.url.includes('localhost') || m.url.includes('127.0.0.1'))) {
                            try {
                                const urlObj = new URL(m.url);
                                return { ...m, url: `${baseUrl}${urlObj.pathname}${urlObj.search}` };
                            }
                            catch {
                                return m;
                            }
                        }
                        return m;
                    }
                    const baseUrl = this.configService.get('BASE_URL');
                    if (baseUrl) {
                        const cleanPath = m.url.startsWith('/') ? m.url : `/${m.url}`;
                        return { ...m, url: `${baseUrl}${cleanPath}` };
                    }
                    const backendPort = this.configService.get('PORT') || '3002';
                    const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
                    const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1'
                        ? '192.168.1.38'
                        : endpoint;
                    const cleanPath = m.url.startsWith('/') ? m.url : `/${m.url}`;
                    return { ...m, url: `http://${resolvedEndpoint}:${backendPort}${cleanPath}` };
                }) || [],
            }));
            console.log('[getProfile] User isAdmin check:', {
                isAdmin: user.isAdmin,
                userIsAdmin,
                roles: user.roles,
                activeRole
            });
            return {
                ...user,
                isAdmin: userIsAdmin,
                avatar: transformAvatarUrl(user.avatar),
                isFollowing,
                hasRequested,
                isOwnProfile,
                posts: transformedPosts,
                canViewPosts,
                followerCount,
                followingCount,
                _count: {
                    posts: postsCount,
                },
                badges: badgeIds,
                capabilities,
                sidebar,
                dateOfBirth: user.dateOfBirth,
                country: user.country,
                city: user.city,
                gender: user.gender,
                profileCompleted: user.profileCompleted,
                activeRole: activeRole || null,
                showProfileColorSignature: user.showProfileColorSignature ?? true,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            console.error('❌ [getProfile] Error:', error);
            console.error('❌ [getProfile] Error details:', {
                message: error?.message,
                stack: error?.stack,
                username: username,
                currentUserId: currentUserId,
                errorName: error?.constructor?.name,
            });
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            console.error('❌ [getProfile] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw new common_1.NotFoundException(`Profil yüklenirken bir hata oluştu: ${errorMessage}. Lütfen tekrar deneyin.`);
        }
    }
    async getSelf(userId) {
        try {
            if (!userId) {
                throw new common_1.NotFoundException('Kullanıcı kimliği geçersiz.');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    avatar: true,
                    bio: true,
                    website: true,
                    roles: true,
                    extras: true,
                    plan: true,
                    badges: true,
                    createdAt: true,
                    usernameLastChangedAt: true,
                    profileCompleted: true,
                    dateOfBirth: true,
                    country: true,
                    city: true,
                    gender: true,
                    phoneNumber: true,
                    phoneVerified: true,
                    accountStatus: true,
                    suspendedUntil: true,
                    suspensionReason: true,
                },
            });
            if (!user) {
                throw new common_1.NotFoundException('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
            }
            if (!user.username) {
                throw new common_1.NotFoundException('Kullanıcı adı bulunamadı. Lütfen profil bilgilerinizi güncelleyin.');
            }
            const normalizedRoles = (0, roles_utils_1.ensureRoleAssignment)(user.roles ?? []);
            const plan = user.plan ?? 'FREE';
            const badgeIds = Array.isArray(user.badges) ? user.badges : [];
            const capabilities = (0, roles_utils_1.computeCapabilities)(normalizedRoles, plan, badgeIds);
            const dashboard = (0, dashboard_features_1.getDashboardSnapshot)(normalizedRoles[0], plan);
            const sidebar = (0, roles_utils_1.getSidebarVisibility)(capabilities);
            const transformAvatarUrl = (avatar) => {
                if (!avatar)
                    return null;
                if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                    const baseUrl = this.configService.get('BASE_URL');
                    if (baseUrl && (avatar.includes('localhost') || avatar.includes('127.0.0.1'))) {
                        try {
                            const urlObj = new URL(avatar);
                            return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
                        }
                        catch {
                            return avatar;
                        }
                    }
                    return avatar;
                }
                const baseUrl = this.configService.get('BASE_URL');
                if (baseUrl) {
                    const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
                    return `${baseUrl}${cleanPath}`;
                }
                const backendPort = this.configService.get('PORT') || '3002';
                const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
                const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1'
                    ? '192.168.1.38'
                    : endpoint;
                const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
                return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
            };
            const hasRequiredFields = user.dateOfBirth && user.country && user.city && user.gender;
            const isProfileCompleted = user.profileCompleted === true || hasRequiredFields;
            if (!isProfileCompleted) {
                const existingNotification = await this.prisma.notification.findFirst({
                    where: {
                        userId: user.id,
                        type: 'profile_incomplete',
                    },
                });
                if (!existingNotification) {
                    try {
                        await this.notificationsService.createNotification({
                            userId: user.id,
                            type: 'profile_incomplete',
                            message: 'Profil bilgilerini tamamladığında Feellink deneyimin çok daha güçlü hale gelir.',
                            targetPath: '/settings',
                            targetUrl: '/settings',
                        });
                    }
                    catch (notifError) {
                        console.warn('[UsersService] Failed to create profile_incomplete notification:', notifError);
                    }
                }
            }
            else {
                try {
                    await this.prisma.notification.deleteMany({
                        where: {
                            userId: user.id,
                            type: 'profile_incomplete',
                        },
                    });
                }
                catch (notifError) {
                    console.warn('[UsersService] Failed to delete profile_incomplete notifications:', notifError);
                }
            }
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                avatar: transformAvatarUrl(user.avatar),
                bio: user.bio,
                website: user.website,
                roles: normalizedRoles,
                extras: user.extras ?? [],
                plan,
                badges: badgeIds,
                createdAt: user.createdAt,
                usernameLastChangedAt: user.usernameLastChangedAt,
                phoneNumber: user.phoneNumber,
                phoneVerified: user.phoneVerified,
                profileCompleted: user.profileCompleted,
                dateOfBirth: user.dateOfBirth,
                country: user.country,
                city: user.city,
                gender: user.gender,
                accountStatus: user.accountStatus,
                suspendedUntil: user.suspendedUntil,
                suspensionReason: user.suspensionReason,
                capabilities,
                sidebar,
                dashboard,
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('getSelf error:', error);
            throw new common_1.NotFoundException('Kullanıcı bilgileri yüklenirken bir hata oluştu. Lütfen tekrar giriş yapın.');
        }
    }
    async updateUsername(userId, newUsername) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                usernameLastChangedAt: true,
            },
        });
        if (!currentUser) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        if (currentUser.usernameLastChangedAt) {
            const now = new Date();
            const lastChanged = currentUser.usernameLastChangedAt;
            const diffInDays = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
            if (diffInDays < 14) {
                const remainingDays = Math.ceil(14 - diffInDays);
                throw new common_1.BadRequestException(`Kullanıcı adını yalnızca 14 günde bir değiştirebilirsiniz. Kalan süre: ${remainingDays} gün`);
            }
        }
        const normalizedNewUsername = newUsername.toLowerCase().trim();
        if (currentUser.username.toLowerCase().trim() === normalizedNewUsername) {
            return {
                id: currentUser.id,
                username: currentUser.username,
                usernameLastChangedAt: currentUser.usernameLastChangedAt,
            };
        }
        const allUsers = await this.prisma.user.findMany({
            where: {
                id: { not: userId },
            },
            select: {
                id: true,
                username: true,
            },
        });
        const existingUser = allUsers.find((u) => u.username?.toLowerCase().trim() === normalizedNewUsername);
        if (existingUser) {
            throw new common_1.BadRequestException('Bu kullanıcı adı zaten kullanılıyor.');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                username: normalizedNewUsername,
                usernameLastChangedAt: new Date(),
            },
            select: {
                id: true,
                username: true,
                usernameLastChangedAt: true,
                email: true,
                fullName: true,
                avatar: true,
                bio: true,
                roles: true,
                plan: true,
                badges: true,
                isPrivate: true,
                isVerified: true,
                profileCompleted: true,
                dateOfBirth: true,
                country: true,
                city: true,
                gender: true,
                website: true,
            },
        });
        console.log('✅ [updateUsername] Username güncellendi:', {
            userId,
            oldUsername: currentUser.username,
            newUsername: normalizedNewUsername,
            updatedUser: updatedUser.username,
        });
        return updatedUser;
    }
    async updateProfile(userId, data) {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                fullName: true,
                usernameLastChangedAt: true,
                nameLastChangedAt: true,
            },
        });
        if (!currentUser) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        const updateData = { ...data };
        console.log('[updateProfile] UPDATE DATA:', JSON.stringify(updateData, null, 2));
        delete updateData.username;
        if (updateData.website === '' || updateData.website === undefined) {
            updateData.website = null;
        }
        if (updateData.dateOfBirth) {
            updateData.dateOfBirth = new Date(updateData.dateOfBirth);
        }
        if (updateData.city && updateData.country === 'TR') {
            if (!(0, cities_tr_1.isValidTürkiyeCity)(updateData.city)) {
                throw new common_1.BadRequestException('Geçersiz şehir adı. Lütfen geçerli bir Türkiye ili seçin.');
            }
        }
        if (data.fullName && data.fullName !== currentUser.fullName) {
            if (currentUser.nameLastChangedAt) {
                const diffDays = (Date.now() - currentUser.nameLastChangedAt.getTime()) / (1000 * 60 * 60 * 24);
                if (diffDays < 14) {
                    const remainingDays = Math.ceil(14 - diffDays);
                    throw new common_1.BadRequestException(`Ad Soyad'ı yalnızca 14 günde bir değiştirebilirsiniz. Kalan süre: ${remainingDays} gün`);
                }
            }
            updateData.nameLastChangedAt = new Date();
        }
        let devModeCode = null;
        if (data.phoneNumber !== undefined && data.phoneNumber !== null) {
            if (!SMS_VERIFICATION_ENABLED) {
                throw new common_1.BadRequestException('SMS doğrulama özelliği şu anda kapalıdır.');
            }
            const cleanedPhone = data.phoneNumber.replace(/\s/g, '').replace(/[()-]/g, '');
            updateData.phoneNumber = cleanedPhone;
            updateData.phoneVerified = false;
            devModeCode = await this.sendPhoneVerificationCode(userId, cleanedPhone);
        }
        const currentUserData = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { dateOfBirth: true, country: true, city: true, gender: true },
        });
        const finalDateOfBirth = updateData.dateOfBirth !== undefined ? updateData.dateOfBirth : currentUserData?.dateOfBirth;
        const finalCountry = updateData.country !== undefined ? updateData.country : currentUserData?.country;
        const finalCity = updateData.city !== undefined ? updateData.city : currentUserData?.city;
        const finalGender = updateData.gender !== undefined ? updateData.gender : currentUserData?.gender;
        const allRequiredFieldsPresent = Boolean(finalDateOfBirth && finalCountry && finalCity && finalGender);
        updateData.profileCompleted = allRequiredFieldsPresent;
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                bio: true,
                avatar: true,
                isPrivate: true,
                isVerified: true,
                website: true,
                profileCompleted: true,
                phoneNumber: true,
                phoneVerified: true,
                dateOfBirth: true,
                country: true,
                city: true,
                gender: true,
                showProfileColorSignature: true,
            },
        });
        console.log('[updateProfile] UPDATED USER:', JSON.stringify(updatedUser, null, 2));
        console.log('[updateProfile] USERNAME FROM DB:', updatedUser.username);
        console.log('[updateProfile] PROFILE COMPLETED:', updatedUser.profileCompleted);
        if (allRequiredFieldsPresent) {
            try {
                await this.prisma.notification.deleteMany({
                    where: {
                        userId: userId,
                        type: 'profile_incomplete',
                    },
                });
                console.log('[updateProfile] ✅ Profile completed - deleted profile_incomplete notifications');
            }
            catch (notifError) {
                console.warn('[UsersService] Failed to delete profile_incomplete notifications:', notifError);
            }
        }
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        if (isDev && devModeCode) {
            return {
                ...updatedUser,
                _devMode: {
                    smsCode: devModeCode,
                    message: 'Geliştirme modu: SMS kodu console\'da ve response\'da gösteriliyor',
                },
            };
        }
        return updatedUser;
    }
    async completeOnboarding(userId, data) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, profileCompleted: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        if (user.profileCompleted) {
            throw new common_1.BadRequestException('Profil zaten tamamlanmış.');
        }
        const dateOfBirth = new Date(data.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--;
        }
        if (age < 13) {
            throw new common_1.BadRequestException('Feellink\'i kullanmak için en az 13 yaşında olmalısınız.');
        }
        if (!data.gdprConsent) {
            throw new common_1.BadRequestException('Kişisel verilerin işlenmesi için onay gereklidir.');
        }
        if (data.city && data.country === 'TR') {
            if (!(0, cities_tr_1.isValidTürkiyeCity)(data.city)) {
                throw new common_1.BadRequestException('Geçersiz şehir adı. Lütfen geçerli bir Türkiye ili seçin.');
            }
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                dateOfBirth,
                country: data.country,
                city: data.city,
                gender: data.gender,
                gdprConsent: data.gdprConsent,
                gdprConsentAt: data.gdprConsent ? new Date() : null,
                analyticsConsent: data.analyticsConsent || false,
                profileCompleted: true,
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                avatar: true,
                bio: true,
                profileCompleted: true,
                dateOfBirth: true,
                country: true,
                city: true,
                gender: true,
                roles: true,
                plan: true,
                badges: true,
                isPrivate: true,
                isVerified: true,
                isAdmin: true,
                superAdmin: true,
            },
        });
        const hasRequiredFields = updatedUser.dateOfBirth && updatedUser.country && updatedUser.city && updatedUser.gender;
        if (hasRequiredFields) {
            try {
                await this.prisma.notification.deleteMany({
                    where: {
                        userId: userId,
                        type: 'profile_incomplete',
                    },
                });
            }
            catch (notifError) {
                console.warn('[UsersService] Failed to delete profile_incomplete notifications:', notifError);
            }
        }
        return {
            success: true,
            user: updatedUser,
            message: 'Profil başarıyla tamamlandı.',
        };
    }
    async searchUsers(query, currentUserId) {
        const blockedUserIds = await this.prisma.block.findMany({
            where: {
                OR: [
                    { blockerId: currentUserId },
                    { blockedId: currentUserId },
                ],
            },
            select: {
                blockerId: true,
                blockedId: true,
            },
        });
        const excludedUserIds = new Set();
        blockedUserIds.forEach((block) => {
            if (block.blockerId === currentUserId) {
                excludedUserIds.add(block.blockedId);
            }
            else {
                excludedUserIds.add(block.blockerId);
            }
        });
        excludedUserIds.add(currentUserId);
        const users = await this.prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { fullName: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                    { id: { notIn: Array.from(excludedUserIds) } },
                ],
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                isVerified: true,
            },
            take: 20,
        });
        const getAvatarUrl = (avatar) => {
            if (!avatar)
                return null;
            if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                const baseUrl = this.configService.get('BASE_URL');
                if (baseUrl && (avatar.includes('localhost') || avatar.includes('127.0.0.1'))) {
                    try {
                        const urlObj = new URL(avatar);
                        return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
                    }
                    catch {
                        return avatar;
                    }
                }
                return avatar;
            }
            const baseUrl = this.configService.get('BASE_URL');
            if (baseUrl) {
                const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
                return `${baseUrl}${cleanPath}`;
            }
            const backendPort = this.configService.get('PORT') || '3002';
            const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
            const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1'
                ? '192.168.1.38'
                : endpoint;
            const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
            return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
        };
        return users.map((u) => ({
            id: u.id,
            username: u.username,
            fullName: u.fullName,
            avatar: getAvatarUrl(u.avatar),
            avatarUrl: getAvatarUrl(u.avatar),
            isVerified: u.isVerified,
        }));
    }
    async getHighlights(userId) {
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingIds = following.map(f => f.followingId);
        const usersWithStories = await this.prisma.user.findMany({
            where: {
                id: { in: followingIds },
                stories: {
                    some: {
                        expiresAt: { gt: new Date() },
                    },
                },
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                isVerified: true,
            },
            take: 20,
        });
        if (usersWithStories.length === 0) {
            const activeUsers = await this.prisma.user.findMany({
                where: {
                    id: { in: followingIds },
                    isOnline: true,
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatar: true,
                    isVerified: true,
                },
                take: 10,
            });
            return activeUsers;
        }
        return usersWithStories;
    }
    async updateRoles(userId, payload) {
        const input = Array.isArray(payload) ? { roles: payload } : payload ?? { roles: undefined, plan: undefined, extras: undefined };
        const current = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                roles: true,
                extras: true,
                plan: true,
                badges: true,
                isAdmin: true,
            },
        });
        if (!current) {
            throw new common_1.NotFoundException('User not found');
        }
        const normalizedRoles = (0, roles_utils_1.ensureRoleAssignment)(input.roles ?? (current.roles ?? []));
        const nextPlan = (input.plan ?? current.plan ?? 'FREE');
        const extrasNormalized = Array.from(new Set((input.extras ?? (current.extras ?? []))
            .filter((extra) => typeof extra === 'string')
            .map((extra) => extra.trim())
            .filter((extra) => extra.length > 0)
            .map((extra) => EXTRA_BADGE_CODE_MAP[extra] ?? extra)));
        const nextBadges = getBadgesFromSelection(normalizedRoles, nextPlan, extrasNormalized);
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                roles: normalizedRoles,
                extras: extrasNormalized,
                plan: nextPlan,
                badges: nextBadges,
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                roles: true,
                extras: true,
                plan: true,
                badges: true,
                isAdmin: true,
            },
        });
        const userPlan = updatedUser.plan ?? nextPlan;
        const capabilities = (0, roles_utils_1.computeCapabilities)(updatedUser.roles, userPlan, updatedUser.badges ?? []);
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
        const userIsAdmin = current.isAdmin === true;
        const activeRole = getActiveRole(normalizedRoles, userIsAdmin);
        return {
            message: 'Rol ve plan bilgileri güncellendi',
            user: {
                ...updatedUser,
                activeRole: activeRole || null,
            },
            capabilities,
            sidebar,
        };
    }
    async getRoleCapabilities(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                roles: true,
                plan: true,
                badges: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const plan = user.plan ?? 'FREE';
        return (0, roles_utils_1.computeCapabilities)(user.roles ?? [], plan, user.badges ?? []);
    }
    async updatePlan(userId, plan) {
        if (!['FREE', 'PRO', 'ORI'].includes(plan)) {
            throw new common_1.BadRequestException('Geçersiz plan seçimi');
        }
        const existing = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                roles: true,
                extras: true,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        const normalizedRoles = (0, roles_utils_1.ensureRoleAssignment)(existing.roles ?? []);
        const extrasNormalized = Array.from(new Set((Array.isArray(existing.extras) ? existing.extras : []).map((extra) => EXTRA_BADGE_CODE_MAP[extra] ?? extra)));
        const nextBadges = getBadgesFromSelection(normalizedRoles, plan, extrasNormalized);
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                plan,
                extras: extrasNormalized,
                badges: nextBadges,
            },
            select: {
                id: true,
                username: true,
                plan: true,
                roles: true,
                extras: true,
                badges: true,
            },
        });
        const userPlan = updatedUser.plan ?? plan;
        const capabilities = (0, roles_utils_1.computeCapabilities)(updatedUser.roles, userPlan, updatedUser.badges ?? []);
        const sidebar = (0, roles_utils_1.getSidebarVisibility)(capabilities);
        return {
            message: plan === 'PRO' ? 'Pro üyeliğe geçildi' : 'Free plana geri dönüldü',
            user: updatedUser,
            capabilities,
            sidebar,
        };
    }
    getRolesOverview() {
        return (0, roles_utils_1.getRoleOverview)();
    }
    async blockUser(blockerId, blockedId) {
        if (blockerId === blockedId) {
            throw new common_1.BadRequestException('Kendinizi engelleyemezsiniz.');
        }
        const blockedUser = await this.prisma.user.findUnique({
            where: { id: blockedId },
        });
        if (!blockedUser) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        const existingBlock = await this.prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });
        if (existingBlock) {
            throw new common_1.BadRequestException('Bu kullanıcı zaten engellenmiş.');
        }
        await this.prisma.block.create({
            data: {
                blockerId,
                blockedId,
            },
        });
        await this.prisma.follow.deleteMany({
            where: {
                followerId: blockerId,
                followingId: blockedId,
            },
        });
        await this.prisma.follow.deleteMany({
            where: {
                followerId: blockedId,
                followingId: blockerId,
            },
        });
        await this.prisma.followRequest.deleteMany({
            where: {
                OR: [
                    { requesterId: blockerId, requestedId: blockedId },
                    { requesterId: blockedId, requestedId: blockerId },
                ],
            },
        });
        const [blockerFollowingCount, blockedFollowerCount] = await Promise.all([
            this.prisma.follow.count({
                where: { followerId: blockerId },
            }),
            this.prisma.follow.count({
                where: { followingId: blockedId },
            }),
        ]);
        await Promise.all([
            this.prisma.user.update({
                where: { id: blockerId },
                data: { followingCount: blockerFollowingCount },
            }),
            this.prisma.user.update({
                where: { id: blockedId },
                data: { followerCount: blockedFollowerCount },
            }),
        ]);
        return { message: 'Kullanıcı başarıyla engellendi.' };
    }
    async unblockUser(blockerId, blockedId) {
        const block = await this.prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });
        if (!block) {
            throw new common_1.NotFoundException('Bu kullanıcı engellenmemiş.');
        }
        await this.prisma.block.delete({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });
        return { message: 'Engel başarıyla kaldırıldı.' };
    }
    async getBlockedUsers(blockerId) {
        const blocks = await this.prisma.block.findMany({
            where: { blockerId },
            include: {
                blocked: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return blocks.map((block) => ({
            id: block.blocked.id,
            username: block.blocked.username,
            fullName: block.blocked.fullName,
            avatar: block.blocked.avatar,
            isVerified: block.blocked.isVerified,
            blockedAt: block.createdAt,
        }));
    }
    async deleteAccount(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        const now = new Date();
        const scheduledDeletionAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        accountStatus: 'PENDING_DELETION',
                        deletionRequestedAt: now,
                        scheduledDeletionAt,
                    },
                });
                await tx.refreshToken.deleteMany({ where: { userId } });
            });
        }
        catch (err) {
            console.error('[UsersService] deleteAccount error:', err?.message || err);
            throw new common_1.InternalServerErrorException('Hesap silinirken bir sorun oluştu. Lütfen tekrar deneyin.');
        }
        return { message: 'Hesabınız silme sürecine alındı. 15 gün içinde giriş yaparak hesabınızı yeniden aktif hale getirebilirsiniz.' };
    }
    async purgeScheduledDeletions() {
        const now = new Date();
        const usersToPurge = await this.prisma.user.findMany({
            where: {
                accountStatus: 'PENDING_DELETION',
                scheduledDeletionAt: { lte: now },
            },
            select: { id: true },
        });
        let purged = 0;
        for (const u of usersToPurge) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    await tx.refreshToken.deleteMany({ where: { userId: u.id } });
                    await tx.user.delete({ where: { id: u.id } });
                });
                purged++;
            }
            catch (err) {
                console.error('[UsersService] purgeScheduledDeletions error for', u.id, err?.message || err);
            }
        }
        return purged;
    }
    async getSavedArtworks(userId) {
        const savedArtworks = await this.prisma.savedArtwork.findMany({
            where: {
                userId,
                post: {
                    type: 'artwork',
                },
            },
            include: {
                post: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                avatar: true,
                                isVerified: true,
                            },
                        },
                        media: {
                            orderBy: { order: 'asc' },
                        },
                        _count: {
                            select: {
                                likes: true,
                                comments: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const validArtworks = savedArtworks.filter((sa) => sa.post !== null);
        const postIds = validArtworks.map(sa => sa.postId);
        const likes = await this.prisma.like.findMany({
            where: {
                postId: { in: postIds },
                userId,
            },
        });
        const likedPostIds = new Set(likes.map(l => l.postId));
        return validArtworks.map(savedArtwork => ({
            ...savedArtwork.post,
            isLiked: likedPostIds.has(savedArtwork.postId),
            savedAt: savedArtwork.createdAt,
        }));
    }
    async getSaved(userId) {
        const [savedPosts, savedArtworks] = await Promise.all([
            this.prisma.savedPost.findMany({
                where: {
                    userId,
                },
                include: {
                    post: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullName: true,
                                    avatar: true,
                                    isVerified: true,
                                },
                            },
                            media: {
                                orderBy: { order: 'asc' },
                            },
                            _count: {
                                select: {
                                    likes: true,
                                    comments: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.savedArtwork.findMany({
                where: {
                    userId,
                },
                include: {
                    post: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullName: true,
                                    avatar: true,
                                    isVerified: true,
                                },
                            },
                            media: {
                                orderBy: { order: 'asc' },
                            },
                            _count: {
                                select: {
                                    likes: true,
                                    comments: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const validPosts = savedPosts.filter(sp => sp.post !== null);
        const validArtworks = savedArtworks.filter(sa => sa.post !== null && sa.post.type === 'artwork');
        const allPostIds = [
            ...validPosts.map(sp => sp.postId),
            ...validArtworks.map(sa => sa.postId),
        ];
        const likes = await this.prisma.like.findMany({
            where: {
                postId: { in: allPostIds },
                userId,
            },
        });
        const likedPostIds = new Set(likes.map(l => l.postId));
        const savedItems = [
            ...validPosts.map(savedPost => ({
                type: 'post',
                ...savedPost.post,
                isLiked: likedPostIds.has(savedPost.postId),
                savedAt: savedPost.createdAt,
            })),
            ...validArtworks.map(savedArtwork => ({
                type: 'artwork',
                ...savedArtwork.post,
                isLiked: likedPostIds.has(savedArtwork.postId),
                savedAt: savedArtwork.createdAt,
            })),
        ];
        return savedItems.sort((a, b) => {
            const aDate = new Date(a.savedAt).getTime();
            const bDate = new Date(b.savedAt).getTime();
            return bDate - aDate;
        });
    }
    async sendPhoneVerificationCode(userId, phoneNumber) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);
        await this.prisma.phoneVerification.deleteMany({
            where: {
                userId,
                verified: false,
            },
        });
        await this.prisma.phoneVerification.create({
            data: {
                userId,
                phoneNumber,
                code,
                expiresAt,
            },
        });
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        if (isDev) {
            console.log('\n📱 [DEV SMS] ============================================');
            console.log(`📞 Telefon: ${phoneNumber}`);
            console.log(`🔐 Doğrulama Kodu: ${code}`);
            console.log(`⏰ Geçerlilik: 5 dakika`);
            console.log('================================================\n');
            return code;
        }
        else {
            return null;
        }
    }
    async verifyPhone(userId, code) {
        if (!SMS_VERIFICATION_ENABLED) {
            throw new common_1.BadRequestException('SMS doğrulama özelliği şu anda kapalıdır.');
        }
        const verification = await this.prisma.phoneVerification.findFirst({
            where: {
                userId,
                code,
                verified: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!verification) {
            throw new common_1.BadRequestException('Geçersiz veya süresi dolmuş doğrulama kodu.');
        }
        await this.prisma.phoneVerification.update({
            where: { id: verification.id },
            data: { verified: true },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { phoneVerified: true },
        });
        return {
            success: true,
            message: 'Telefon numarası başarıyla doğrulandı.',
        };
    }
    async resendPhoneCode(userId) {
        if (!SMS_VERIFICATION_ENABLED) {
            throw new common_1.BadRequestException('SMS doğrulama özelliği şu anda kapalıdır.');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { phoneNumber: true },
        });
        if (!user || !user.phoneNumber) {
            throw new common_1.BadRequestException('Telefon numarası bulunamadı. Lütfen önce telefon numaranızı ekleyin.');
        }
        const devModeCode = await this.sendPhoneVerificationCode(userId, user.phoneNumber);
        const response = {
            success: true,
            message: 'Doğrulama kodu yeniden gönderildi.',
        };
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        if (isDev && devModeCode) {
            response._devMode = {
                smsCode: devModeCode,
            };
        }
        return response;
    }
    async getColorSignature(username) {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(username);
        let user = null;
        if (isObjectId) {
            user = await this.prisma.user.findFirst({
                where: { id: username },
                select: { id: true },
            });
        }
        else {
            user = await this.prisma.user.findFirst({
                where: { username: { equals: username, mode: 'insensitive' } },
                select: { id: true },
            });
        }
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        }
        const userArtworks = await this.prisma.post.findMany({
            where: {
                userId: user.id,
                type: 'artwork',
            },
            select: {
                id: true,
                colorPalette: true,
                colors: true,
                media: {
                    select: {
                        url: true,
                        type: true,
                    },
                    orderBy: { order: 'asc' },
                    take: 1,
                },
            },
        });
        const allColors = [];
        for (const artwork of userArtworks) {
            if (artwork.colorPalette && artwork.colorPalette.length > 0) {
                allColors.push(...artwork.colorPalette);
            }
            else if (artwork.colors && artwork.colors.length > 0) {
                allColors.push(...artwork.colors);
            }
        }
        const colorFrequency = {};
        for (const color of allColors) {
            if (color && typeof color === 'string' && color.trim() !== '') {
                colorFrequency[color] = (colorFrequency[color] || 0) + 1;
            }
        }
        const topColors = Object.entries(colorFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([color]) => color);
        return { topColors };
    }
    async getProfileAnalysis(username, currentUserId) {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(username);
        let user = null;
        if (isObjectId) {
            user = await this.prisma.user.findFirst({
                where: { id: username },
                select: { id: true, username: true, isPrivate: true },
            });
        }
        else {
            const found = await this.prisma.user.findFirst({
                where: { username: { equals: username, mode: 'insensitive' } },
                select: { id: true, username: true, isPrivate: true },
            });
            user = found;
        }
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        }
        if (user.isPrivate && currentUserId !== user.id) {
            throw new common_1.ForbiddenException('Bu profil gizli; analiz yalnızca profil sahibi tarafından görüntülenebilir.');
        }
        const posts = await this.prisma.post.findMany({
            where: { userId: user.id, isDeleted: false },
            select: {
                id: true,
                colorPalette: true,
                colors: true,
                createdAt: true,
            },
        });
        const postIds = posts.map((p) => p.id);
        const [likesByPost, commentsByPost] = await Promise.all([
            postIds.length > 0
                ? this.prisma.like.findMany({
                    where: { postId: { in: postIds } },
                    select: { postId: true },
                })
                : [],
            postIds.length > 0
                ? this.prisma.comment.findMany({
                    where: { postId: { in: postIds } },
                    select: { postId: true },
                })
                : [],
        ]);
        const likeCountByPost = {};
        const commentCountByPost = {};
        for (const id of postIds) {
            likeCountByPost[id] = 0;
            commentCountByPost[id] = 0;
        }
        for (const l of likesByPost) {
            if (likeCountByPost[l.postId] !== undefined)
                likeCountByPost[l.postId]++;
        }
        for (const c of commentsByPost) {
            if (commentCountByPost[c.postId] !== undefined)
                commentCountByPost[c.postId]++;
        }
        const totalPosts = posts.length;
        const totalLikes = Object.values(likeCountByPost).reduce((a, b) => a + b, 0);
        const totalComments = Object.values(commentCountByPost).reduce((a, b) => a + b, 0);
        const avgLikesPerPost = totalPosts > 0 ? totalLikes / totalPosts : 0;
        const postEngagement = postIds.map((id) => ({
            id,
            score: (likeCountByPost[id] ?? 0) + (commentCountByPost[id] ?? 0),
        }));
        postEngagement.sort((a, b) => b.score - a.score);
        const mostEngagedPostId = postEngagement.length > 0 && postEngagement[0].score > 0 ? postEngagement[0].id : null;
        const allColors = [];
        for (const post of posts) {
            if (post.colorPalette?.length)
                allColors.push(...post.colorPalette);
            else if (post.colors?.length)
                allColors.push(...post.colors);
        }
        const colorFreq = {};
        for (const c of allColors) {
            if (c && typeof c === 'string' && c.trim())
                colorFreq[c] = (colorFreq[c] || 0) + 1;
        }
        const palette = Object.entries(colorFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([color]) => color);
        const MONTH_NAMES_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const monthCounts = {};
        for (const p of posts) {
            const m = new Date(p.createdAt).getMonth();
            monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
        const activeMonthEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
        const activeMonth = activeMonthEntry ? MONTH_NAMES_TR[Number(activeMonthEntry[0])] ?? null : null;
        const now = new Date();
        const firstPost = posts.length ? new Date(Math.min(...posts.map((p) => p.createdAt.getTime()))) : now;
        const monthsDiff = Math.max(1, (now.getFullYear() - firstPost.getFullYear()) * 12 + (now.getMonth() - firstPost.getMonth()));
        const postsPerMonth = totalPosts / monthsDiff;
        const postingFrequency = postsPerMonth < 2 ? 'low' : postsPerMonth < 6 ? 'medium' : 'high';
        function hexToHsl(hex) {
            const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!match)
                return null;
            const r = parseInt(match[1], 16) / 255;
            const g = parseInt(match[2], 16) / 255;
            const b = parseInt(match[3], 16) / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0;
            const l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                if (max === r)
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                else if (max === g)
                    h = ((b - r) / d + 2) / 6;
                else
                    h = ((r - g) / d + 4) / 6;
                return { h: h * 360, s: s ?? 0, l };
            }
            return { h: 0, s: 0, l };
        }
        let colorProfile;
        if (palette.length > 0) {
            const hslList = palette.map(hexToHsl).filter((x) => x != null);
            if (hslList.length > 0) {
                const warmCount = hslList.filter((hsl) => (hsl.h >= 0 && hsl.h < 60) || (hsl.h >= 300 && hsl.h <= 360)).length;
                const coolCount = hslList.filter((hsl) => hsl.h >= 120 && hsl.h < 300).length;
                const total = hslList.length;
                const warmRatio = total ? warmCount / total : 0.5;
                const coolRatio = total ? coolCount / total : 0.5;
                const avgBrightness = hslList.reduce((s, x) => s + x.l, 0) / hslList.length;
                const avgSaturation = hslList.reduce((s, x) => s + x.s, 0) / hslList.length;
                let dominantMood = 'balanced';
                if (warmRatio > 0.6 && avgSaturation > 0.5)
                    dominantMood = 'warm-vivid';
                else if (coolRatio > 0.6 && avgSaturation > 0.5)
                    dominantMood = 'cool-vivid';
                else if (warmRatio > 0.6)
                    dominantMood = 'warm';
                else if (coolRatio > 0.6)
                    dominantMood = 'cool';
                colorProfile = { warmRatio, coolRatio, avgBrightness, avgSaturation, dominantMood };
            }
        }
        const parts = [];
        if (colorProfile) {
            if (colorProfile.dominantMood === 'warm-vivid')
                parts.push('Üretimlerinde sıcak ve yüksek doygunluklu tonlar öne çıkıyor.');
            else if (colorProfile.dominantMood === 'cool-vivid')
                parts.push('Soğuk ve canlı renk paleti görsel dilini yansıtıyor.');
            else if (colorProfile.dominantMood === 'warm')
                parts.push('Sıcak tonlar ağırlıklı.');
            else if (colorProfile.dominantMood === 'cool')
                parts.push('Soğuk ton eğilimi belirgin.');
            else if (colorProfile.avgSaturation > 0.6)
                parts.push('Yüksek doygunluklu renkler kullanılıyor.');
        }
        if (postingFrequency === 'high')
            parts.push('Üretim ritmi yoğun.');
        else if (postingFrequency === 'medium')
            parts.push('Düzenli paylaşım ritmi görülüyor.');
        if (totalLikes + totalComments > 0)
            parts.push('Etkileşim alan paylaşımlar öne çıkıyor.');
        const summary = parts.length > 0 ? parts.join(' ') : 'Profil analizi henüz yeterli veriyle zenginleştirilecek.';
        return {
            userId: user.id,
            username: user.username,
            visibility: user.isPrivate ? 'private' : 'public',
            palette,
            colorProfile,
            productionProfile: {
                totalPosts,
                activeMonth,
                postingFrequency,
            },
            engagement: {
                totalLikes,
                totalComments,
                avgLikesPerPost: Math.round(avgLikesPerPost * 10) / 10,
                mostEngagedPostId,
            },
            summary,
        };
    }
    async createRoleChangeRequest(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { roles: true, username: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        const currentRole = user.roles?.[0];
        if (dto.requestedRole === currentRole) {
            throw new common_1.BadRequestException('Zaten bu role sahipsiniz.');
        }
        const existingRequest = await this.prisma.roleChangeRequest.findFirst({
            where: {
                userId,
                status: 'PENDING',
            },
        });
        if (existingRequest) {
            throw new common_1.BadRequestException('Zaten bekleyen bir rol değişikliği talebiniz var.');
        }
        const request = await this.prisma.roleChangeRequest.create({
            data: {
                userId,
                requestedRole: dto.requestedRole,
                message: dto.message || null,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
        });
        try {
            const admins = await this.prisma.user.findMany({
                where: {
                    OR: [{ isAdmin: true }, { superAdmin: true }],
                },
                select: { id: true },
            });
            for (const admin of admins) {
                await this.notificationsService.createNotification({
                    userId: admin.id,
                    type: 'role_change_request',
                    message: `${user.username || 'Bir kullanıcı'} rol değişikliği talebinde bulundu.`,
                    meta: {
                        requestId: request.id,
                        requestedRole: dto.requestedRole,
                    },
                });
            }
        }
        catch (error) {
            console.error('Bildirim gönderilirken hata:', error);
        }
        return {
            success: true,
            message: 'Rol değişikliği talebiniz gönderildi. Yöneticiler tarafından incelenecektir.',
            request: {
                id: request.id,
                requestedRole: request.requestedRole,
                status: request.status,
                createdAt: request.createdAt,
            },
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        notifications_service_1.NotificationsService])
], UsersService);
//# sourceMappingURL=users.service.js.map