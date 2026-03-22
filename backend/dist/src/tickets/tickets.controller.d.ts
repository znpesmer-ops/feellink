import { Response } from 'express';
import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private ticketsService;
    constructor(ticketsService: TicketsService);
    createTicket(user: any, data: any): Promise<{
        id: string;
        price: number;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        type: string;
        capacity: number;
        sold: number;
        qrCodeUrl: string;
    }>;
    getMyTickets(user: any): Promise<({
        ticket: {
            event: {
                date: Date;
                participantCount: number;
                maxParticipants: number;
                id: string;
                title: string;
                description: string;
                coverImage: string;
                ticketUrl: string;
                price: number;
                isFree: boolean;
                location: string;
                ownerId: string;
                reminderMailSent: boolean;
                isDeleted: boolean;
                deletedAt: Date;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            price: number;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            type: string;
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
        price: number;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        type: string;
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
