export declare function getWebSocketCorsConfig(): {
    cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    };
    transports: string[];
    allowEIO3: boolean;
};
