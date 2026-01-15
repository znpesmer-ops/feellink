import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
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

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      if (isDevelopment) {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        if (origin.includes('.trycloudflare.com')) {
          return callback(null, true);
        }
        const localIPPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;
        if (localIPPattern.test(origin)) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      } else {
        // Production: allow Vercel domains and configured origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (origin.includes('.vercel.app')) {
          return callback(null, true);
        }
        if (origin.includes('feellink.io')) {
          return callback(null, true);
        }
      }
      
      callback(new Error('Not allowed by CORS'));
    },
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
    expressApp(req, res);
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
