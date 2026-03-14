import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: {
        userId: string;
    }): Promise<{
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        badges: string[];
        email: string;
        username: string;
        fullName: string;
        id: string;
        bio: string;
        avatar: string;
        roles: import(".prisma/client").$Enums.UserRole[];
        isPrivate: boolean;
        isVerified: boolean;
        isAdmin: boolean;
        superAdmin: boolean;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        isDeleted: boolean;
    }>;
}
export {};
