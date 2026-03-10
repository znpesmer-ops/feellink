"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAnyRole = exports.hasRole = exports.isAdmin = exports.isSuperAdmin = void 0;
function isSuperAdmin(user) {
    if (!user)
        return false;
    return Boolean(user.superAdmin === true);
}
exports.isSuperAdmin = isSuperAdmin;
function isAdmin(user) {
    if (!user)
        return false;
    return Boolean(user.isAdmin === true || user.superAdmin === true);
}
exports.isAdmin = isAdmin;
function hasRole(user, requiredRole) {
    if (!user)
        return false;
    if (isSuperAdmin(user))
        return true;
    return Boolean(user.roles?.includes(requiredRole));
}
exports.hasRole = hasRole;
function hasAnyRole(user, requiredRoles) {
    if (!user)
        return false;
    if (isSuperAdmin(user))
        return true;
    if (!user.roles || !requiredRoles.length)
        return false;
    return requiredRoles.some((role) => user.roles?.includes(role));
}
exports.hasAnyRole = hasAnyRole;
//# sourceMappingURL=permissions.util.js.map