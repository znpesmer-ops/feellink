import * as fs from 'fs';
import * as path from 'path';

const NOTO_REG = path.join('fonts', 'NotoSans-Regular.ttf');

/**
 * Vercel serverless'ta cwd genelde /var/task; assets/ includeFiles ile gelmeli.
 * Lokal: backend kökünde assets/. dist/main: cwd = backend.
 */
export function resolveFeellinkAssetsRoot(): string {
  const candidates = [
    path.join(process.cwd(), 'assets'),
    path.join(process.cwd(), 'backend', 'assets'),
  ];
  try {
    // dist/src/common/thisfile.js -> ../../../assets
    candidates.push(path.resolve(__dirname, '..', '..', '..', 'assets'));
  } catch {
    /* ignore */
  }
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, NOTO_REG))) {
      return root;
    }
  }
  return path.join(process.cwd(), 'assets');
}

/**
 * Bazı ortamlarda canvas registerFont yalnızca /tmp altındaki dosyayı güvenilir okur.
 */
export function copyFontToTmpIfNeeded(absTtfPath: string, tmpName: string): string {
  if (!fs.existsSync(absTtfPath)) {
    return absTtfPath;
  }
  const resolved = path.resolve(absTtfPath);
  const tmpPath = path.join('/tmp', tmpName);
  try {
    fs.copyFileSync(resolved, tmpPath);
    return tmpPath;
  } catch {
    return resolved;
  }
}

/** Vercel’de font dosyası bazen yalnızca /tmp’ten register edildiğinde Pango doğru yükler. */
export function fontPathForRegister(absTtfPath: string, tmpName: string): string {
  if (!fs.existsSync(absTtfPath)) {
    return path.resolve(absTtfPath);
  }
  if (process.env.VERCEL) {
    return copyFontToTmpIfNeeded(absTtfPath, tmpName);
  }
  return path.resolve(absTtfPath);
}
