import { Response } from 'express';
import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private ticketsService;
    constructor(ticketsService: TicketsService);
    createTicket(user: any, data: any): Promise<{
        id: string;
        createdAt: Date;
        eventId: string;
        type: string;
        price: number;
        capacity: number;
        sold: number;
        qrCodeUrl: string;
        updatedAt: Date;
    }>;
    getMyTickets(user: any): Promise<({
        ticket: {
            event: {
                id: string;
                createdAt: Date;
                price: number;
                updatedAt: Date;
                date: Date;
                isDeleted: boolean;
                deletedAt: Date;
                title: string;
                location: string;
                coverImage: string;
                description: string;
                ownerId: string;
                participantCount: number;
                maxParticipants: number;
                ticketUrl: string;
                isFree: boolean;
                reminderMailSent: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            eventId: string;
            type: string;
            price: number;
            capacity: number;
            sold: number;
            qrCodeUrl: string;
            updatedAt: Date;
        };
    } & {
        id: string;
        ticketId: string;
        userId: string;
        code: string;
        qrUrl: string;
        used: boolean;
        usedAt: Date;
        createdAt: Date;
    })[]>;
    getEventTickets(eventId: string): Promise<{
        id: string;
        createdAt: Date;
        eventId: string;
        type: string;
        price: number;
        capacity: number;
        sold: number;
        qrCodeUrl: string;
        updatedAt: Date;
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
