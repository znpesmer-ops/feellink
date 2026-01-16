// Vercel serverless function handler
// Vercel will compile this TypeScript file and import from src/main
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../src/main';

export default handler;
