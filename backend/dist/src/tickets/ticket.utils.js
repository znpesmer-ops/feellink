"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQrDataUrl = exports.generateCode = void 0;
const crypto = require("crypto");
const QRCode = require("qrcode");
const generateCode = (len = 12) => {
    return crypto.randomBytes(Math.ceil(len / 2))
        .toString('hex')
        .slice(0, len)
        .toUpperCase();
};
exports.generateCode = generateCode;
async function generateQrDataUrl(payload) {
    return QRCode.toDataURL(payload, { margin: 1, width: 400 });
}
exports.generateQrDataUrl = generateQrDataUrl;
//# sourceMappingURL=ticket.utils.js.map