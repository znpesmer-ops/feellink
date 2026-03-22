"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fontPathForRegister = exports.copyFontToTmpIfNeeded = exports.resolveFeellinkAssetsRoot = void 0;
const fs = require("fs");
const path = require("path");
const NOTO_REG = path.join('fonts', 'NotoSans-Regular.ttf');
function resolveFeellinkAssetsRoot() {
    const candidates = [
        path.join(process.cwd(), 'assets'),
        path.join(process.cwd(), 'backend', 'assets'),
    ];
    try {
        candidates.push(path.resolve(__dirname, '..', '..', '..', 'assets'));
    }
    catch {
    }
    for (const root of candidates) {
        if (fs.existsSync(path.join(root, NOTO_REG))) {
            return root;
        }
    }
    return path.join(process.cwd(), 'assets');
}
exports.resolveFeellinkAssetsRoot = resolveFeellinkAssetsRoot;
function copyFontToTmpIfNeeded(absTtfPath, tmpName) {
    if (!fs.existsSync(absTtfPath)) {
        return absTtfPath;
    }
    const resolved = path.resolve(absTtfPath);
    const tmpPath = path.join('/tmp', tmpName);
    try {
        fs.copyFileSync(resolved, tmpPath);
        return tmpPath;
    }
    catch {
        return resolved;
    }
}
exports.copyFontToTmpIfNeeded = copyFontToTmpIfNeeded;
function fontPathForRegister(absTtfPath, tmpName) {
    if (!fs.existsSync(absTtfPath)) {
        return path.resolve(absTtfPath);
    }
    if (process.env.VERCEL) {
        return copyFontToTmpIfNeeded(absTtfPath, tmpName);
    }
    return path.resolve(absTtfPath);
}
exports.fontPathForRegister = fontPathForRegister;
//# sourceMappingURL=resolve-feellink-assets.js.map