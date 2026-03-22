"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWeekRange = exports.getEndOfWeekSunday = exports.getStartOfWeekMonday = void 0;
function getStartOfWeekMonday(reference = new Date()) {
    const d = new Date(reference);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return d;
}
exports.getStartOfWeekMonday = getStartOfWeekMonday;
function getEndOfWeekSunday(startMonday) {
    const end = new Date(startMonday);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}
exports.getEndOfWeekSunday = getEndOfWeekSunday;
function getCurrentWeekRange(reference = new Date()) {
    const start = getStartOfWeekMonday(reference);
    const end = getEndOfWeekSunday(start);
    return { start, end };
}
exports.getCurrentWeekRange = getCurrentWeekRange;
//# sourceMappingURL=week-range.util.js.map