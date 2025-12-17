import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as net from 'net';

async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const isFree = await new Promise<boolean>((resolve) => {
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

    if (isFree) {
      return port;
    }

    port += 1;
  }

  throw new Error(`No available ports found starting from ${startPort}`);
}

async function bootstrap() {
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
  const localIP = '192.168.1.59'; // 🔥 Mobil erişim için local IP
  const mainIP = '192.168.1.6'; // 🔥 Ana network IP (WiFi/Ethernet)
  const vpnIP = '192.168.175.1'; // 🔥 VPN erişim için IP
  const vmIP = '192.168.56.1'; // 🔥 VM/Network erişim için IP
  const allowedOrigins = isDevelopment
    ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        `http://${localIP}:3000`, // 🔥 Mobil frontend erişimi
        `http://${localIP}:3001`, // 🔥 Alternatif port
        `http://${localIP}:3002`, // 🔥 Backend port
        `http://${localIP}`, // 🔥 Bazı cihazlar port eklemeden bağlanır
        `http://${mainIP}:3000`, // 🔥 Ana network frontend erişimi
        `http://${mainIP}:3001`, // 🔥 Ana network alternatif port
        `http://${mainIP}:3002`, // 🔥 Ana network backend port
        `http://${mainIP}`, // 🔥 Ana network bazı cihazlar port eklemeden bağlanır
        `http://${vpnIP}:3000`, // 🔥 VPN frontend erişimi
        `http://${vpnIP}:3001`, // 🔥 VPN alternatif port
        `http://${vpnIP}:3002`, // 🔥 VPN backend port
        `http://${vpnIP}`, // 🔥 VPN bazı cihazlar port eklemeden bağlanır
        `http://${vmIP}:3000`, // 🔥 VM/Network frontend erişimi
        `http://${vmIP}:3001`, // 🔥 VM/Network alternatif port
        `http://${vmIP}:3002`, // 🔥 VM/Network backend port
        `http://${vmIP}`, // 🔥 VM/Network bazı cihazlar port eklemeden bağlanır
        'https://composer-variation-result-father.trycloudflare.com', // 🔥 Cloudflare Frontend Tunnel
      ]
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Development'ta local IP pattern'lerini de kabul et
      if (isDevelopment) {
        // Localhost ve 127.0.0.1
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        // Cloudflare tunnel domain'leri
        if (origin.includes('.trycloudflare.com')) {
          return callback(null, true);
        }
        // Local IP pattern (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const localIPPattern = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;
        if (localIPPattern.test(origin)) {
          return callback(null, true);
        }
        // Explicitly allowed origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      } else {
        // Production: only allow configured origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Instagram Clone API')
    .setDescription('A full-featured Instagram clone API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Global exception filter - TÜM HATALARI LOGLA
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Geçici olarak false - debug için
      transform: true,
      enableDebugMessages: true, // Detaylı hata mesajları için
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        // Detaylı validation hata mesajları
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        const logger = new Logger('ValidationPipe');
        logger.error(`Validation failed: ${JSON.stringify(messages, null, 2)}`);
        logger.error(`Validation errors detail: ${JSON.stringify(errors.map(e => ({
          property: e.property,
          value: e.value,
          constraints: e.constraints
        })), null, 2)}`);
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

  const basePort = parseInt(process.env.PORT || '3002', 10);
  const port = await findAvailablePort(basePort);

  // 🔥 Mobil erişim için 0.0.0.0'da dinle (tüm network interface'lerde)
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Feellink backend running on http://localhost:${port}`);
  logger.log(`🌐 Network access: http://${localIP}:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();

