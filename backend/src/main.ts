import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { json, raw, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedServer: any;

async function bootstrapServer() {
  if (cachedServer) {
    return cachedServer;
  }

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  // Favicon handler - yoksay (204 No Content)
  app.use('/favicon.ico', (_, res) => res.status(204).end());

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

  // 🚨 GLOBAL FILTER ŞİMDİLİK KAPALI - gerçek hatayı görmek için
  // app.useGlobalFilters(new AllExceptionsFilter());

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

    await new Promise<void>((resolve, reject) => {
      server(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err: any) {
    console.error('🔥 VERCEL UNHANDLED ERROR:', err);
    console.error('🔥 Error stack:', err?.stack);
    console.error('🔥 Error name:', err?.name);

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: err?.message || 'Internal Server Error',
        error: 'Internal Server Error',
      });
    }
  }
}
