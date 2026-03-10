export declare class AppController {
    root(): {
        status: string;
        service: string;
        env: string;
        timestamp: string;
    };
    health(): {
        status: string;
        timestamp: string;
        service: string;
    };
}
