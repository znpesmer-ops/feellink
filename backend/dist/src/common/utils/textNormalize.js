"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeText = void 0;
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/ç/g, "c")
        .replace(/ğ/g, "g")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ş/g, "s")
        .replace(/ü/g, "u")
        .replace(/Ç/g, "c")
        .replace(/Ğ/g, "g")
        .replace(/İ/g, "i")
        .replace(/Ö/g, "o")
        .replace(/Ş/g, "s")
        .replace(/Ü/g, "u")
        .replace(/[^a-z0-9]/g, "");
}
exports.normalizeText = normalizeText;
//# sourceMappingURL=textNormalize.js.map