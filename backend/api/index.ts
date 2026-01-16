// Vercel serverless function handler
// This file routes all requests to the NestJS handler
// Vercel automatically compiles TypeScript, so we can import from src
import handler from '../src/main';

export default handler;
