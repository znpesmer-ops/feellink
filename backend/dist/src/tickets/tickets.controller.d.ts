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
        price: number;
        eventId: string;
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
                description: string;
                title: string;
                coverImage: string;
                date: Date;
                participantCount: number;
                ticketUrl: string;
                price: number;
                isFree: boolean;
                location: string;
                ownerId: string;
                reminderMailSent: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: string;
            price: number;
            eventId: string;
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
        price: number;
        eventId: string;
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
