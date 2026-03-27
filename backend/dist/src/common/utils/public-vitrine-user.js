"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserEligibleForPublicVitrine = exports.publicVitrineUserWhere = void 0;
exports.publicVitrineUserWhere = {
    isDeleted: false,
    deletedAt: null,
    accountStatus: 'ACTIVE',
};
function isUserEligibleForPublicVitrine(user) {
    if (!user)
        return false;
    if (user.isDeleted === true)
        return false;
    if (user.deletedAt != null)
        return false;
    if (user.accountStatus !== 'ACTIVE')
        return false;
    return true;
}
exports.isUserEligibleForPublicVitrine = isUserEligibleForPublicVitrine;
//# sourceMappingURL=public-vitrine-user.js.map