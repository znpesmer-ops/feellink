"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommentSubtreeTx = void 0;
async function deleteCommentSubtreeTx(tx, commentId) {
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
exports.deleteCommentSubtreeTx = deleteCommentSubtreeTx;
//# sourceMappingURL=comment-delete-subtree.js.map