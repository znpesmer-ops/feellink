import { Prisma } from '@prisma/client';
export declare function deleteCommentSubtreeTx(tx: Prisma.TransactionClient, commentId: string): Promise<number>;
