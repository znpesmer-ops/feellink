import { Response } from 'express';
import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private ticketsService;
    constructor(ticketsService: TicketsService);
    createTicket(user: any, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        eventId: string;
        price: number;
        capacity: number;
        sold: number;
        qrCodeUrl: string;
    }>;
    getMyTickets(user: any): Promise<({
        ticket: {
            event: {
                id: string;
                isDeleted: boolean;
                deletedAt: Date;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                location: string;
                date: Date;
                description: string;
                coverImage: string;
                participantCount: number;
                ticketUrl: string;
                price: number;
                isFree: boolean;
                ownerId: string;
                reminderMailSent: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
            eventId: string;
            price: number;
            capacity: number;
            sold: number;
            qrCodeUrl: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        code: string;
        ticketId: string;
        qrUrl: string;
        used: boolean;
        usedAt: Date;
    })[]>;
    getEventTickets(eventId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        eventId: string;
        price: number;
        capacity: number;
        sold: number;
        qrCodeUrl: string;
    }[]>;
    purchaseTicket(user: any, data: any): Promise<{
        purchaseId: string;
        code: string;
        qrDataUrl: string;
    }>;
    validateTicket(user: any, data: any): Promise<{
        ok: boolean;
        userId: string;
        ticketId: string;
        userName: string;
        eventTitle: string;
    }>;
    generateTicketPdf(code: string, res: Response): Promise<void>;
}
