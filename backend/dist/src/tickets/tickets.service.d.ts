import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TicketMailerService } from './ticket-mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
export declare class TicketsService {
    private prisma;
    private mailer;
    private notificationsService;
    private notificationsGateway;
    constructor(prisma: PrismaService, mailer: TicketMailerService, notificationsService: NotificationsService, notificationsGateway: NotificationsGateway);
    createTicket(userId: string, data: {
        eventId: string;
        type: string;
        price: number;
        capacity: number;
    }): Promise<{
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
    getMyTickets(userId: string): Promise<({
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
    purchaseTicket(userId: string, data: {
        ticketId: string;
    }): Promise<{
        purchaseId: string;
        code: string;
        qrDataUrl: string;
    }>;
    validateTicket(data: {
        code: string;
    }): Promise<{
        ok: boolean;
        userId: string;
        ticketId: string;
        userName: string;
        eventTitle: string;
    }>;
    generateTicketPdf(code: string, res: Response): Promise<void>;
}
