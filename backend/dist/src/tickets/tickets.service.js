"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ticket_mailer_service_1 = require("./ticket-mailer.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const ticket_utils_1 = require("./ticket.utils");
const pdfkit_1 = require("pdfkit");
const fs = require("fs");
const path = require("path");
let TicketsService = class TicketsService {
    constructor(prisma, mailer, notificationsService, notificationsGateway) {
        this.prisma = prisma;
        this.mailer = mailer;
        this.notificationsService = notificationsService;
        this.notificationsGateway = notificationsGateway;
    }
    async createTicket(userId, data) {
        const event = await this.prisma.event.findUnique({
            where: { id: data.eventId },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to add tickets to this event');
        }
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${data.eventId}`)}&size=200x200`;
        return this.prisma.ticket.create({
            data: {
                eventId: data.eventId,
                type: data.type,
                price: data.price,
                capacity: data.capacity,
                qrCodeUrl: qrUrl,
            },
        });
    }
    async getMyTickets(userId) {
        return this.prisma.ticketPurchase.findMany({
            where: { userId },
            include: {
                ticket: {
                    include: { event: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getEventTickets(eventId) {
        return this.prisma.ticket.findMany({
            where: { eventId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async purchaseTicket(userId, data) {
        return await this.prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.findUnique({
                where: { id: data.ticketId },
                include: { event: true },
            });
            if (!ticket) {
                throw new common_1.NotFoundException('Bilet bulunamadı');
            }
            if (ticket.sold >= ticket.capacity) {
                throw new common_1.BadRequestException('Bilet tükendi');
            }
            const updated = await tx.ticket.update({
                where: { id: data.ticketId },
                data: { sold: { increment: 1 } },
            });
            let code = (0, ticket_utils_1.generateCode)(12);
            while (await tx.ticketPurchase.findUnique({ where: { code } })) {
                code = (0, ticket_utils_1.generateCode)(12);
            }
            const ticketUrlPayload = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/verify/${code}`;
            const qrDataUrl = await (0, ticket_utils_1.generateQrDataUrl)(ticketUrlPayload);
            const purchase = await tx.ticketPurchase.create({
                data: {
                    ticketId: data.ticketId,
                    userId,
                    code,
                    qrUrl: qrDataUrl,
                },
            });
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { email: true, fullName: true },
            });
            this.mailer
                .sendTicketEmail(user.email, {
                eventTitle: ticket.event.title,
                code,
                qrDataUrl,
            })
                .catch((e) => console.error('Mail gönderilemedi:', e));
            this.notificationsService
                .createEventTicketNotification(ticket.event.id, userId)
                .catch((e) => console.error('Bildirim oluşturulamadı:', e));
            const buyer = await tx.user.findUnique({
                where: { id: userId },
                select: { username: true, fullName: true, avatar: true },
            });
            if (buyer) {
                this.notificationsGateway.emitTicketUpdate(ticket.event.id, {
                    eventId: ticket.event.id,
                    username: buyer.username,
                    fullName: buyer.fullName,
                    avatar: buyer.avatar,
                    createdAt: purchase.createdAt,
                    ticketCount: updated.sold,
                });
            }
            return {
                purchaseId: purchase.id,
                code,
                qrDataUrl,
            };
        });
    }
    async validateTicket(data) {
        return await this.prisma.$transaction(async (tx) => {
            const purchase = await tx.ticketPurchase.findUnique({
                where: { code: data.code },
                include: { ticket: { include: { event: true } }, user: true },
            });
            if (!purchase) {
                throw new common_1.NotFoundException('Bilet bulunamadı');
            }
            if (purchase.used) {
                throw new common_1.BadRequestException('Bilet zaten kullanıldı');
            }
            const updated = await tx.ticketPurchase.update({
                where: { id: purchase.id },
                data: { used: true, usedAt: new Date() },
            });
            try {
                await tx.eventParticipant.create({
                    data: { eventId: purchase.ticket.eventId, userId: purchase.userId },
                });
            }
            catch (err) {
            }
            return {
                ok: true,
                userId: purchase.userId,
                ticketId: purchase.ticketId,
                userName: purchase.user.fullName || purchase.user.username,
                eventTitle: purchase.ticket.event.title,
            };
        });
    }
    async generateTicketPdf(code, res) {
        const ticket = await this.prisma.ticketPurchase.findUnique({
            where: { code },
            include: {
                ticket: {
                    include: { event: true },
                },
                user: true,
            },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Bilet bulunamadı');
        }
        const doc = new pdfkit_1.default({
            size: 'A4',
            margin: 40,
            layout: 'portrait',
            bufferPages: false,
            autoFirstPage: true,
            info: {
                Title: `Feellink Bilet - ${ticket.ticket.event.title}`,
                Author: 'Feellink',
                Subject: 'Etkinlik Bileti',
            }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Feellink_Bilet_${ticket.code}.pdf"`);
        doc.pipe(res);
        const orange = '#ff7b00';
        const dark = '#111827';
        const gray = '#374151';
        const grayLight = '#6B7280';
        const white = '#FFFFFF';
        doc
            .rect(0, 0, doc.page.width, 70)
            .fill(orange);
        doc
            .fillColor(white)
            .font('Helvetica-Bold')
            .fontSize(22)
            .text('Feellink', doc.page.width / 2, 25, { align: 'center' });
        doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor(white)
            .opacity(1)
            .text('Digital Art & Events Platform', doc.page.width / 2, 48, { align: 'center' });
        const cardWidth = 500;
        const cardLeft = (doc.page.width - cardWidth) / 2;
        const startY = 100;
        const cardHeight = 260;
        doc
            .roundedRect(cardLeft, startY, cardWidth, cardHeight, 12)
            .fill('#FFFFFF')
            .lineWidth(2.5)
            .stroke(orange);
        doc
            .font('Helvetica-Bold')
            .fontSize(17)
            .fillColor(dark)
            .opacity(1)
            .text('Etkinlik Bileti', cardLeft + cardWidth / 2, startY + 20, { align: 'center' });
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(orange)
            .opacity(1)
            .text(`Kod: ${ticket.code}`, cardLeft + cardWidth - 25, startY + 20, { align: 'right' });
        const infoLeft = cardLeft + 35;
        let infoY = startY + 55;
        doc
            .font('Helvetica')
            .fontSize(12)
            .fillColor(dark)
            .opacity(1);
        doc
            .font('Helvetica-Bold')
            .fontSize(15)
            .fillColor(dark)
            .opacity(1)
            .text(ticket.ticket.event.title, infoLeft, infoY, {
            width: cardWidth - 70,
            ellipsis: true
        });
        infoY += 28;
        doc
            .moveTo(infoLeft, infoY - 8)
            .lineTo(cardLeft + cardWidth - 35, infoY - 8)
            .lineWidth(0.5)
            .stroke(gray)
            .opacity(0.4);
        infoY += 18;
        doc.font('Helvetica').fontSize(11);
        doc
            .fillColor(dark)
            .opacity(1)
            .text(`Tarih: ${new Date(ticket.ticket.event.date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`, infoLeft, infoY);
        infoY += 22;
        if (ticket.ticket.event.location) {
            doc
                .fillColor(dark)
                .opacity(1)
                .text(`Yer: ${ticket.ticket.event.location}`, infoLeft, infoY);
            infoY += 22;
        }
        if (ticket.ticket.event.description) {
            const desc = ticket.ticket.event.description.length > 70
                ? ticket.ticket.event.description.substring(0, 70) + '...'
                : ticket.ticket.event.description;
            doc
                .fontSize(10)
                .fillColor(gray)
                .opacity(1)
                .text(desc, infoLeft, infoY, {
                width: cardWidth - 70,
                lineGap: 1,
            });
            infoY += 28;
        }
        else {
            infoY += 12;
        }
        doc
            .fontSize(11)
            .fillColor(dark)
            .opacity(1)
            .text(`Katılımcı: ${ticket.user.fullName || ticket.user.username}`, infoLeft, infoY);
        infoY += 20;
        doc
            .fillColor(dark)
            .opacity(1)
            .text(`E-posta: ${ticket.user.email}`, infoLeft, infoY, {
            width: cardWidth - 70,
            ellipsis: true
        });
        infoY += 20;
        const statusText = ticket.used ? 'Durum: Kullanıldı' : 'Durum: Aktif';
        const statusColor = ticket.used ? '#dc2626' : '#059669';
        doc
            .fillColor(statusColor)
            .font('Helvetica-Bold')
            .opacity(1)
            .text(statusText, infoLeft, infoY);
        if (ticket.qrUrl) {
            try {
                const tmpDir = '/tmp';
                if (!fs.existsSync(tmpDir)) {
                    fs.mkdirSync(tmpDir, { recursive: true });
                }
                const qrPath = path.join(tmpDir, `${ticket.code}-qr.png`);
                const base64Data = ticket.qrUrl.replace(/^data:image\/png;base64,/, '');
                fs.writeFileSync(qrPath, base64Data, 'base64');
                const qrSize = 100;
                const qrX = doc.page.width / 2 - qrSize / 2;
                const qrY = startY + cardHeight + 15;
                const qrTotalHeight = qrSize + 15 + 10;
                const footerHeight = 50;
                const totalNeededHeight = qrY + qrTotalHeight + footerHeight;
                const maxAllowedY = doc.page.height - footerHeight - qrTotalHeight - 10;
                const finalQrY = Math.min(qrY, maxAllowedY);
                const borderWidth = 2.5;
                const borderPadding = 5;
                doc
                    .roundedRect(qrX - borderPadding, finalQrY - borderPadding, qrSize + (borderPadding * 2), qrSize + (borderPadding * 2), 8)
                    .lineWidth(borderWidth)
                    .stroke(orange)
                    .fill('#FFFFFF');
                doc
                    .roundedRect(qrX - 1, finalQrY - 1, qrSize + 2, qrSize + 2, 5)
                    .fill('#FFFFFF');
                doc.image(qrPath, qrX, finalQrY, { width: qrSize, height: qrSize });
                doc
                    .fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor(dark)
                    .opacity(1)
                    .text('QR Kod', doc.page.width / 2, finalQrY + qrSize + 10, { align: 'center' });
                fs.unlinkSync(qrPath);
            }
            catch (error) {
                console.error('QR kod yuklenemedi:', error);
            }
        }
        const footerY = doc.page.height - 45;
        doc
            .moveTo(50, footerY - 5)
            .lineTo(doc.page.width - 50, footerY - 5)
            .lineWidth(0.5)
            .stroke(gray)
            .opacity(0.4);
        doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(gray)
            .opacity(1)
            .text('Bu bilet Feellink tarafından dijital olarak oluşturulmuştur.', doc.page.width / 2, footerY, { align: 'center', width: doc.page.width - 100 });
        doc
            .fontSize(8)
            .fillColor(gray)
            .opacity(1)
            .text('QR kodu girişte okutunuz.', doc.page.width / 2, footerY + 10, { align: 'center' });
        doc
            .fontSize(7)
            .fillColor(grayLight)
            .opacity(1)
            .text('Feellink - Sanatı, Teknolojiyle Buluştur', doc.page.width / 2, doc.page.height - 15, { align: 'center' });
        doc.end();
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_gateway_1.NotificationsGateway))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ticket_mailer_service_1.TicketMailerService,
        notifications_service_1.NotificationsService,
        notifications_gateway_1.NotificationsGateway])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map