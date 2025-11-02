import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

export const generateCode = (len = 12): string => {
  return crypto.randomBytes(Math.ceil(len / 2))
    .toString('hex')
    .slice(0, len)
    .toUpperCase();
};

export async function generateQrDataUrl(payload: string): Promise<string> {
  // payload: örn. `${process.env.FRONTEND_URL}/tickets/verify/${code}`
  return QRCode.toDataURL(payload, { margin: 1, width: 400 });
}

