// Vercel serverless function handler for NestJS
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedApp: any;

async function bootstrapApp() {
  if (cachedApp) {
    return cachedApp;
  }

  // Dynamic import to avoid issues with build order
  const { NestFactory } = await import('@nestjs/core');
  const { ValidationPipe, Logger, HttpException } = await import('@nestjs/common');
  const { json, raw, urlencoded } = await import('express');
  const cookieParser = await import('cookie-parser');
  const { AppModule } = await import('../src/app.module');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Bootstrap');

  app.use(cookieParser.default());

  // Favicon handler
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
  cachedApp = server;

  logger.log('✅ NestJS initialized for Vercel');
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const server = await bootstrapApp();
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
