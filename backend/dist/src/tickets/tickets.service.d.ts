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
    getMyTickets(userId: string): Promise<({
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
