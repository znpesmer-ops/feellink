// Vercel serverless function - TypeScript (Vercel auto-compiles)
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { json, raw, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedServer: any = null;

async function bootstrapServer() {
  if (cachedServer) {
    return cachedServer;
  }

  try {
    console.log('🚀 Starting NestJS bootstrap...');
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    });

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const logger = new Logger('Bootstrap');

    app.use(cookieParser());

    app.use('/favicon.ico', (_, res) => {
      res.status(204).end();
    });

    app.use('/payments/webhook', raw({ type: 'application/json' }));

    app.use(json({ limit: '2mb' }));
    app.use(urlencoded({ limit: '2mb', extended: true }));

    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        enableDebugMessages: process.env.NODE_ENV !== 'production',
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            const constraints = error.constraints || {};
            return Object.values(constraints).join(', ');
          });
          const logger = new Logger('ValidationPipe');
          logger.error(`Validation failed: ${JSON.stringify(messages, null, 2)}`);
          return new HttpException(
            {
              statusCode: 400,
              message: messages,
              error: 'Bad Request',
            },
            400,
          );
        },
      }),
    );

    await app.init();

    const server = app.getHttpAdapter().getInstance();
    cachedServer = server;

    logger.log('✅ NestJS initialized for Vercel');
    return server;
  } catch (bootstrapError: any) {
    console.error('🔥 BOOTSTRAP ERROR:', {
      message: bootstrapError?.message,
      stack: bootstrapError?.stack,
      name: bootstrapError?.name,
    });
    throw bootstrapError;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`📥 Request: ${req.method} ${req.url}`);
    const server = await bootstrapServer();
    
    // Direct server call - Express handles errors internally
    server(req, res);
  } catch (err: any) {
    // Detailed error logging for debugging
    const errorDetails = {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      code: err?.code,
      cause: err?.cause,
      path: req.url,
      method: req.method,
    };

    console.error('🔥 VERCEL RUNTIME ERROR:', JSON.stringify(errorDetails, null, 2));
    console.error('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    });

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message:
          process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err?.message || 'Internal Server Error',
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { details: errorDetails }),
      });
    }
  }
}
