export function getWebSocketCorsConfig() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const localIP = '192.168.1.59';
  const mainIP = '192.168.1.6';
  const vpnIP = '192.168.175.1';
  const vmIP = '192.168.56.1';
  
  const allowedOrigins = isDevelopment
    ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        `http://${localIP}:3000`,
        `http://${localIP}:3001`,
        `http://${localIP}:3002`,
        `http://${localIP}`,
        `http://${mainIP}:3000`,
        `http://${mainIP}:3001`,
        `http://${mainIP}:3002`,
        `http://${mainIP}`,
        `http://${vpnIP}:3000`,
        `http://${vpnIP}:3001`,
        `http://${vpnIP}:3002`,
        `http://${vpnIP}`,
        `http://${vmIP}:3000`,
        `http://${vmIP}:3001`,
        `http://${vmIP}:3002`,
        `http://${vmIP}`,
        'https://composer-variation-result-father.trycloudflare.com',
      ]
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

  return {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true);
        }
        
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
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  };
}






