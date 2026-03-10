import { EmailChangeService } from './email-change.service';
export declare class EmailChangeController {
    private emailChangeService;
    constructor(emailChangeService: EmailChangeService);
    requestEmailChange(user: any, body: {
        newEmail: string;
    }): Promise<{
        message: string;
    }>;
    confirmEmailChange(token: string): Promise<{
        message: string;
    }>;
    getPendingEmailChange(user: any): Promise<{
        newEmail: string;
        expiresAt: Date;
    }>;
    resendConfirmationEmail(user: any): Promise<{
        message: string;
    }>;
}
