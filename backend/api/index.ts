import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic import to handle both dev and production builds
let AppModule: any;
let AllExceptionsFilter: any;

let cachedApp: any = null;

async function loadModules() {
  if (AppModule && AllExceptionsFilter) {
    return;
  }

  try {
    // Try dist first (production build)
    const appModulePath = require.resolve('../dist/app.module');
    const filterPath = require.resolve('../dist/common/filters/http-exception.filter');
    AppModule = require(appModulePath).AppModule;
    AllExceptionsFilter = require(filterPath).AllExceptionsFilter;
  } catch (error) {
    // Fallback to src (development)
    try {
      const appModulePath = require.resolve('../src/app.module');
      const filterPath = require.resolve('../src/common/filters/http-exception.filter');
      AppModule = require(appModulePath).AppModule;
      AllExceptionsFilter = require(filterPath).AllExceptionsFilter;
    } catch (err) {
      console.error('Failed to load modules:', err);
      throw err;
    }
  }
}

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  try {
    await loadModules();
  } catch (error) {
    console.error('Error loading modules:', error);
    throw error;
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('Bootstrap');

  // Cookie parser for refreshToken cookies
  app.use(cookieParser());

  // Stripe webhook needs raw body
  app.use('/payments/webhook', raw({ type: 'application/json' }));

  // Body size limits
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // Enable CORS for Vercel - TÜM VERCEL DOMAIN'LERİNE İZİN VER
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://feellink.vercel.app',
    'https://feellink.vercel.app',
    'https://www.feellink.io',
    'https://feellink.io',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // No origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Exact match in allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Vercel domains (ALL .vercel.app domains)
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      // Feellink domains
      if (origin.includes('feellink.io')) {
        return callback(null, true);
      }
      
      // Local development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Default: allow (for debugging - production'da kısıtlanabilir)
      console.warn('CORS: Unknown origin allowed:', origin);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Swagger setup (only in development)
  if (process.env.NODE_ENV !== 'production') {
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

  // Global exception filter
  if (AllExceptionsFilter) {
    app.useGlobalFilters(new AllExceptionsFilter());
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      enableDebugMessages: process.env.NODE_ENV !== 'production',
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
  try {
    const app = await createApp();
    const expressApp = app.getHttpAdapter().getInstance();
    
    // Handle the request with Express app
    expressApp(req, res);
  } catch (error: any) {
    console.error('Vercel handler error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Detailed error response for debugging
    const errorResponse = {
      statusCode: 500,
      message: error?.message || 'Internal server error',
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error?.stack,
        details: error,
      }),
    };
    
    res.status(500).json(errorResponse);
  }
}
