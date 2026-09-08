export function isVercelServerlessRuntime(): boolean {
  return process.env.VERCEL === '1' || process.env.DISABLE_BACKGROUND_JOBS === '1';
}
