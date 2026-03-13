export declare class HealthController {
    health(): {
        status: string;
        timestamp: string;
        service: string;
    };
    mailStatus(): {
        mailMode: string;
        smtpConfigured: boolean;
        smtpHost: string;
        resetLinkBase: string;
        willActuallySendMails: boolean;
        envNamesNote: string;
        hint: string;
    };
}
