import { Prisma } from '@prisma/client';
export declare const publicVitrineUserWhere: Prisma.UserWhereInput;
export type PublicVitrineUserCheck = {
    isDeleted?: boolean | null;
    deletedAt?: Date | null;
    accountStatus?: string | null;
};
export declare function isUserEligibleForPublicVitrine(user: PublicVitrineUserCheck | null | undefined): boolean;
