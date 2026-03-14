export declare class MailService {
    private transporter;
    private readonly logger;
    private readonly logoUrl;
    constructor();
    private isProductionMailMode;
    private ensureTransporter;
    sendPasswordResetMail(to: string, resetUrl: string): Promise<any>;
    sendSignupOtpMail(to: string, code: string): Promise<void>;
    sendPasswordResetOtpMail(to: string, code: string): Promise<void>;
    sendWelcomeEmail(user: {
        email: string;
        fullName?: string | null;
        username: string;
    }): Promise<void>;
    sendEvent24HourReminder(params: {
        to: string;
        name: string;
        eventTitle: string;
        eventDate: Date;
        location?: string;
        eventUrl: string;
    }): Promise<void>;
    sendEventReminder(params: {
        to: string;
        name: string;
        eventTitle: string;
        eventDate: Date;
        location?: string;
    }): Promise<void>;
    sendApplicationApprovedMail(params: {
        to: string;
        name: string;
        listingTitle: string;
        companyName?: string;
        contactEmail?: string;
    }): Promise<void>;
    sendApplicationRejectedMail(params: {
        to: string;
        name: string;
        listingTitle: string;
    }): Promise<void>;
    sendReportResolvedEmail(params: {
        to: string;
        userName: string;
        reportedUser: string;
    }): Promise<void>;
    sendEmailChangeConfirmation(params: {
        to: string;
        userName: string;
        confirmUrl: string;
    }): Promise<void>;
    sendEmailChangeNotification(params: {
        to: string;
        userName: string;
        newEmail: string;
    }): Promise<void>;
    sendRoleChangedMail(params: {
        to: string;
        name: string;
        oldRoles?: string[];
        newRoles: string[];
        nextChangeDate?: Date;
    }): Promise<void>;
    sendPasswordChangedMail(params: {
        to: string;
        name: string;
        dateTime: string;
        device?: string;
        location?: string;
        ipMasked?: string;
    }): Promise<void>;
}
