"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketCorsConfig = void 0;
function getWebSocketCorsConfig() {
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
        : [
            process.env.FRONTEND_URL || 'https://feellink.vercel.app',
            'https://feellink.vercel.app',
            'https://www.feellink.io',
            'https://feellink.io',
        ];
    return {
        cors: {
            origin: (origin, callback) => {
                if (!origin) {
                    return callback(null, true);
                }
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
                }
                else {
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
                return callback(null, true);
            },
            credentials: true,
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    };
}
exports.getWebSocketCorsConfig = getWebSocketCorsConfig;
//# sourceMappingURL=websocket-cors.util.js.map