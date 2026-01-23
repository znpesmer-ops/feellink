import { NestFactory } from '@nestjs/core';
// Backend deploy trigger: 2026-01-23-22-40-BACKEND-ONLY
// VERCEL: feellink-backend projesi için Root Directory: backend OLMALI!
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { json, raw, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Deploy trigger: isDeleted filter fix - 2026-01-18

let cachedServer: any;

async function bootstrapServer() {
  if (cachedServer) {
    return cachedServer;
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  // ⚠️ NOT: Vercel Blob Storage kullanıldığında express.static gerekmez
  // Dosyalar Vercel Blob'da tutulur ve public URL'ler direkt kullanılır
  // Local development için static serving korunur
  const isVercel = process.env.VERCEL === '1';
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Sadece Vercel'de DEĞİLSE ve BLOB token YOKSA static serving kullan
  if (!isVercel || !blobToken) {
    const staticPath = join(process.cwd(), 'instagram-uploads');
    app.use(
      '/instagram-uploads',
      express.static(staticPath, {
        setHeaders: (res) => {
          res.set('Cache-Control', 'public, max-age=31536000'); // 1 yıl cache
        },
      }),
    );
  }

  // Favicon handler - yoksay (204 No Content)
  app.use('/favicon.ico', (_, res) => {
    res.status(204).end();
  });

  // Stripe webhook FIRST - raw body needed
  app.use('/payments/webhook', raw({ type: 'application/json' }));

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // ✅ CORS configuration - feellink.io için explicit support
  const allowedOrigins = [
    'https://feellink.io',
    'https://www.feellink.io',
    'https://feellink.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // ✅ Origin header yoksa (Postman, curl, etc.) izin ver
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // ✅ Allowed origins listesinde varsa izin ver
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
        return;
      }
      
      // ✅ Vercel preview deployments için wildcard
      if (origin.includes('vercel.app')) {
        callback(null, true);
        return;
      }
      
      // ❌ Diğer origin'lere izin verme
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400, // 24 hours preflight cache
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const server = await bootstrapServer();
    
    // Express server'ı direkt çağır - Vercel için optimize edilmiş
    server(req, res);
  } catch (err: any) {
    console.error('🔥 VERCEL UNHANDLED ERROR:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: err?.message || 'Internal Server Error',
        error: 'Internal Server Error',
      });
    }
  }
}
