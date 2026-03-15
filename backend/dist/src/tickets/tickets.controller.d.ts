import { Response } from 'express';
import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private ticketsService;
    constructor(ticketsService: TicketsService);
    createTicket(user: any, data: any): Promise<{
        createdAt: Date;
        id: string;
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
                createdAt: Date;
                id: string;
                isDeleted: boolean;
                deletedAt: Date;
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
            createdAt: Date;
            id: string;
            updatedAt: Date;
            type: string;
            price: number;
            eventId: string;
            capacity: number;
            sold: number;
            qrCodeUrl: string;
        };
    } & {
        usedAt: Date;
        createdAt: Date;
        id: string;
        code: string;
        userId: string;
        ticketId: string;
        qrUrl: string;
        used: boolean;
    })[]>;
    getEventTickets(eventId: string): Promise<{
        createdAt: Date;
        id: string;
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
