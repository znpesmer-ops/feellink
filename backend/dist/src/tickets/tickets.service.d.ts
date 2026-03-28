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
        eventId: string;
        type: string;
        price: number;
        capacity: number;
        sold: number;
        qrCodeUrl: string;
        updatedAt: Date;
    }>;
    getMyTickets(userId: string): Promise<({
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
