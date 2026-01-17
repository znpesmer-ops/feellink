import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { json, raw, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
