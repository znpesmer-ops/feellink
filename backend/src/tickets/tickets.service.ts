import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TicketMailerService } from './ticket-mailer.service';
import { generateCode, generateQrDataUrl } from './ticket.utils';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private mailer: TicketMailerService,
  ) {}

  async createTicket(userId: string, data: { eventId: string; type: string; price: number; capacity: number }) {
    // Check if event exists and belongs to user
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to add tickets to this event');
    }

    // Generate QR code URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/${data.eventId}`
    )}&size=200x200`;

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

  async getMyTickets(userId: string) {
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

  async getEventTickets(eventId: string) {
    return this.prisma.ticket.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async purchaseTicket(userId: string, data: { ticketId: string }) {
    return await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: data.ticketId },
        include: { event: true },
      });

      if (!ticket) {
        throw new NotFoundException('Bilet bulunamadı');
      }

      if (ticket.sold >= ticket.capacity) {
        throw new BadRequestException('Bilet tükendi');
      }

      // Satışı rezerve et
      const updated = await tx.ticket.update({
        where: { id: data.ticketId },
        data: { sold: { increment: 1 } },
      });

      // Benzersiz kod üret
      let code = generateCode(12);
      // Collision kontrolü
      while (await tx.ticketPurchase.findUnique({ where: { code } })) {
        code = generateCode(12);
      }

      const ticketUrlPayload = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tickets/verify/${code}`;
      const qrDataUrl = await generateQrDataUrl(ticketUrlPayload);

      // Satın alma kaydı oluştur
      const purchase = await tx.ticketPurchase.create({
        data: {
          ticketId: data.ticketId,
          userId,
          code,
          qrUrl: qrDataUrl,
        },
      });

      // Kullanıcı bilgisini al
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true },
      });

      // E-posta gönder (asenkron)
      this.mailer
        .sendTicketEmail(user.email, {
          eventTitle: ticket.event.title,
          code,
          qrDataUrl,
        })
        .catch((e) => console.error('Mail gönderilemedi:', e));

      return {
        purchaseId: purchase.id,
        code,
        qrDataUrl,
      };
    });
  }

  async validateTicket(data: { code: string }) {
    return await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.ticketPurchase.findUnique({
        where: { code: data.code },
        include: { ticket: { include: { event: true } }, user: true },
      });

      if (!purchase) {
        throw new NotFoundException('Bilet bulunamadı');
      }

      if (purchase.used) {
        throw new BadRequestException('Bilet zaten kullanıldı');
      }

      // İşaretle
      const updated = await tx.ticketPurchase.update({
        where: { id: purchase.id },
        data: { used: true, usedAt: new Date() },
      });

      // Event participant kaydı oluştur (opsiyonel)
      try {
        await tx.eventParticipant.create({
          data: { eventId: purchase.ticket.eventId, userId: purchase.userId },
        });
      } catch (err) {
        // Zaten katıldıysa ignore et
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

  async generateTicketPdf(code: string, res: Response) {
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
      throw new NotFoundException('Bilet bulunamadı');
    }

    // PDF oluştur
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: any[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Feellink_Bilet_${ticket.code}.pdf`,
      );
      res.send(pdfData);
    });

    // Arka plan & başlık
    doc
      .fontSize(26)
      .fillColor('#FF7B00')
      .text('🎟️ Feellink Biletiniz', { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(14)
      .fillColor('#000000')
      .text(`Etkinlik: ${ticket.ticket.event.title}`);
    doc.text(
      `Tarih: ${new Date(ticket.ticket.event.date).toLocaleDateString('tr-TR')}`,
    );
    doc.text(
      `Ad Soyad: ${ticket.user.fullName || ticket.user.username}`,
    );
    doc.text(`Bilet Kodu: ${ticket.code}`);
    doc.text(`Durum: ${ticket.used ? 'Kullanıldı' : 'Aktif'}`);
    doc.moveDown(2);

    // QR Görseli
    if (ticket.qrUrl) {
      const qrPath = path.join('/tmp', `${ticket.code}.png`);
      const base64Data = ticket.qrUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(qrPath, base64Data, 'base64');
      doc.image(qrPath, { fit: [180, 180], align: 'center' });
      fs.unlinkSync(qrPath);
    }

    doc.moveDown(3);
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text('Feellink - Sanatı, Teknolojiyle Buluştur', {
        align: 'center',
      });

    doc.end();
  }
}

