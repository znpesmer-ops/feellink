import { Prisma } from '@prisma/client';

/**
 * Haftalık / aylık vitrin ve public sidebar: silinmiş, silme sürecindeki veya askıdaki hesaplar dahil edilmez.
 */
export const publicVitrineUserWhere: Prisma.UserWhereInput = {
  isDeleted: false,
  deletedAt: null,
  accountStatus: 'ACTIVE',
};

export type PublicVitrineUserCheck = {
  isDeleted?: boolean | null;
  deletedAt?: Date | null;
  accountStatus?: string | null;
};

export function isUserEligibleForPublicVitrine(
  user: PublicVitrineUserCheck | null | undefined,
): boolean {
  if (!user) return false;
  if (user.isDeleted === true) return false;
  if (user.deletedAt != null) return false;
  if (user.accountStatus !== 'ACTIVE') return false;
  return true;
}
