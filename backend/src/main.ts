import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
// DEBUG: Geçici olarak kapatıldı
// import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as net from 'net';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedApp: any = null;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Cookie parser for refreshToken cookies
  app.use(cookieParser());

  // Stripe webhook needs raw body
  app.use('/payments/webhook', raw({ type: 'application/json' }));

  // Body size limits
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // Enable CORS
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = isDevelopment
    ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
      ]
    : [
        process.env.FRONTEND_URL || 'https://feellink.vercel.app',
        'https://feellink.vercel.app',
        'https://www.feellink.io',
        'https://feellink.io',
      ];

  // CORS - Allow all origins for debugging (will restrict later)
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Swagger setup (only in development)
  if (isDevelopment) {
    try {
      const config = new DocumentBuilder()
        .setTitle('Instagram Clone API')
        .setDescription('A full-featured Instagram clone API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document);
    } catch (error) {
      logger.warn('Swagger setup failed:', error);
    }
  }

  // Global exception filter - DEBUG: Geçici olarak kapatıldı
  // app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      enableDebugMessages: isDevelopment,
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

  // Initialize app (don't listen on port for Vercel)
  await app.init();

  cachedApp = app;
  logger.log('🚀 Feellink backend initialized');

  return app;
}

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await createApp();
    const expressApp = app.getHttpAdapter().getInstance();
    
    // Handle the request with proper error handling
    return new Promise<void>((resolve) => {
      expressApp(req, res, (err: any) => {
        if (err) {
          console.error('Express app error:', {
            message: err?.message,
            stack: err?.stack,
          });
          if (!res.headersSent) {
            res.status(500).json({
              statusCode: 500,
              message: err?.message || 'Internal server error',
              error: 'Internal Server Error',
            });
          }
        }
        resolve();
      });
    });
  } catch (error: any) {
    console.error('Vercel handler error:', {
      message: error?.message,
      stack: error?.stack,
    });
    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: error?.message || 'Internal server error',
        error: 'Internal Server Error',
      });
    }
  }
}

// Local development server
if (require.main === module) {
  async function bootstrap() {
    const app = await createApp();
    const logger = new Logger('Bootstrap');

    const port = 3002;
    
    const isPortFree = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        server.close();
        resolve(false);
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });

    if (!isPortFree) {
      logger.error(`❌ Port ${port} meşgul!`);
      process.exit(1);
    }

    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Feellink backend running on http://localhost:${port}`);
  }
  
  bootstrap();
}
