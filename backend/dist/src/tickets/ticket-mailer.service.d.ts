export declare class TicketMailerService {
    private readonly logger;
    private transporter;
    constructor();
    sendTicketEmail(to: string, data: {
        eventTitle: string;
        code: string;
        qrDataUrl: string;
    }): Promise<void>;
}
