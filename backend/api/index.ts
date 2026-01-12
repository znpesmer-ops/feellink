import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
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

  // Enable CORS for Vercel
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://www.feellink.io',
    'https://feellink.io',
    'https://www.feellink.io',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Vercel preview URLs
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger setup (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Instagram Clone API')
      .setDescription('A full-featured Instagram clone API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      enableDebugMessages: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Initialize app (don't listen on port for Vercel)
  await app.init();
  
  cachedApp = app;
  logger.log('🚀 Feellink backend initialized for Vercel');
  
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await createApp();
  const expressApp = app.getHttpAdapter().getInstance();
  
  // Handle the request with Express app
  expressApp(req, res);
}
