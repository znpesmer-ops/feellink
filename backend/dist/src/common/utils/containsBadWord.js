"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsBadWord = void 0;
const bannedWords_1 = require("../constants/bannedWords");
const textNormalize_1 = require("./textNormalize");
function containsBadWord(text) {
    if (!text || text.trim().length === 0) {
        return false;
    }
    const normalized = (0, textNormalize_1.normalizeText)(text);
    return bannedWords_1.BANNED_WORDS.some((word) => normalized.includes((0, textNormalize_1.normalizeText)(word)));
}
exports.containsBadWord = containsBadWord;
//# sourceMappingURL=containsBadWord.js.map