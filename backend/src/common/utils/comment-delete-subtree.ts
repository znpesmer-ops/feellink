import { Prisma } from '@prisma/client';

/**
 * Silinen yorum + tüm alt yanıtlar (recursive).
 * CommentLike, CommentReaction, MonthlyHighlight.commentId temizlenir.
 */
export async function deleteCommentSubtreeTx(
  tx: Prisma.TransactionClient,
  commentId: string,
): Promise<number> {
  const children = await tx.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });
  let removed = 0;
  for (const { id } of children) {
    removed += await deleteCommentSubtreeTx(tx, id);
  }
  await tx.monthlyHighlight.updateMany({
    where: { commentId },
    data: { commentId: null },
  });
  await tx.commentLike.deleteMany({ where: { commentId } });
  await tx.commentReaction.deleteMany({ where: { commentId } });
  await tx.comment.delete({ where: { id: commentId } });
  return removed + 1;
}
