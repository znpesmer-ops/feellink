// Vercel serverless function - TypeScript (Vercel auto-compiles)
// Deploy trigger: VERCEL ROOT DIRECTORY CHECK - 2026-01-23 19:55
// ✅ KRİTİK: Bu dosya backend/ klasöründe, Vercel'de Root Directory: backend olmalı!
// ✅ BACKEND DEPLOY ZORUNLU: Her backend değişikliğinde bu dosya güncellenmeli!
// 🔥 FORCE DEPLOY: Bu yorum satırı değiştiği için Vercel backend'i deploy edecek!
// 🔥 FORCE DEPLOY: Bu değişken değiştiği için Vercel backend'i deploy edecek!
// ⚠️ VERCEL AYARLARI: feellink-backend projesinde Root Directory: backend OLMALI!
const FORCE_DEPLOY_TRIGGER = 'VERCEL_ROOT_DIRECTORY_CHECK_2026_01_23_19_55';
const FORCE_DEPLOY_TRIGGER_2 = 'BACKEND_DEPLOY_REQUIRED_NOW';
const FORCE_DEPLOY_TRIGGER_3 = 'PRODUCTION_ENVIRONMENT_DEPLOY';
const FORCE_DEPLOY_TRIGGER_4 = 'JSON_SYNTAX_ERROR_FIXED';
const FORCE_DEPLOY_TRIGGER_5 = 'BACKEND_CLASSORU_ONLY_NO_FRONTEND';
const FORCE_DEPLOY_TRIGGER_6 = 'ROOT_DIRECTORY_MUST_BE_BACKEND';
// Bu satır Vercel'in backend klasöründe değişiklik algılaması için kritik!
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { json, raw, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
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

    // ✅ BODY SIZE LIMIT - 50MB (gönderi + medya için)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

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
    // ✅ MANUEL CORS HEADERS (Vercel serverless için kritik)
    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = [
      'https://feellink.io',
      'https://www.feellink.io',
      'https://feellink.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    // Origin kontrolü ve header set etme
    if (origin && (allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.includes('vercel.app'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // ✅ Preflight OPTIONS request için hızlı yanıt
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    console.log(`📥 Request: ${req.method} ${req.url} from ${origin || 'unknown'}`);
    const server = await bootstrapServer();
    
    // Wrap in promise to handle async errors
    return new Promise<void>((resolve) => {
      // Handle response finish
      res.on('finish', () => resolve());
      res.on('close', () => resolve());
      
      // Handle server errors
      const errorHandler = (err: Error) => {
        console.error('🔥 SERVER ERROR:', err);
        if (!res.headersSent) {
          res.status(500).json({
            statusCode: 500,
            message: 'Internal Server Error',
            error: 'Internal Server Error',
          });
        }
        resolve();
      };

      // Set timeout
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          res.status(504).json({
            statusCode: 504,
            message: 'Request Timeout',
            error: 'Gateway Timeout',
          });
        }
        resolve();
      }, 29000); // 29 seconds (Vercel limit is 30s)

      // Call server
      try {
        server(req, res);
        
        // Clear timeout when response finishes
        res.once('finish', () => clearTimeout(timeout));
        res.once('close', () => clearTimeout(timeout));
      } catch (syncError: any) {
        clearTimeout(timeout);
        errorHandler(syncError);
      }
    });
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
