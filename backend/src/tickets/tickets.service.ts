import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TicketMailerService } from './ticket-mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { generateCode, generateQrDataUrl } from './ticket.utils';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private mailer: TicketMailerService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
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

      // 🎫 Bilet satın alma bildirimi oluştur (asenkron)
      this.notificationsService
        .createEventTicketNotification(ticket.event.id, userId)
        .catch((e) => console.error('Bildirim oluşturulamadı:', e));

      // 🎟️ Gerçek zamanlı bilet güncelleme eventi (analytics için)
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

    // PDF oluştur - Ortalanmış profesyonel tasarım
    // ✅ Tek sayfa garantisi için bufferPages: false ve içeriği optimize et
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      layout: 'portrait',
      bufferPages: false, // ✅ Fazladan sayfa oluşturmayı engelle
      info: {
        Title: `Feellink Bilet - ${ticket.ticket.event.title}`,
        Author: 'Feellink',
        Subject: 'Etkinlik Bileti',
      }
    });
    
    // Stream directly to response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Feellink_Bilet_${ticket.code}.pdf"`,
    );
    doc.pipe(res);

    // 🎨 Renk Paleti
    const orange = '#ff7b00';
    const dark = '#1a1a1a';
    const gray = '#555555';
    const white = '#FFFFFF';

    // 🟠 Üst Başlık Banner (Turuncu zemin) - Optimize edilmiş boyut
    doc
      .rect(0, 0, doc.page.width, 80) // Daha kompakt (100'den 80'e)
      .fill(orange);
    
    doc
      .fillColor(white)
      .font('Helvetica-Bold')
      .fontSize(24) // Daha kompakt (28'den 24'e)
      .text('Feellink', doc.page.width / 2, 30, { align: 'center' });
    
    doc
      .fontSize(11) // Daha kompakt (12'den 11'e)
      .font('Helvetica')
      .fillColor(white)
      .opacity(0.95)
      .text('Digital Art & Events Platform', doc.page.width / 2, 55, { align: 'center' });

    // 🧾 Bilgi Kutusu (Ortalanmış, kart tasarımı)
    // ✅ Tek sayfa garantisi için boyutları optimize et
    const cardWidth = 480;
    const cardLeft = (doc.page.width - cardWidth) / 2;
    const startY = 120; // Daha yakın (140'tan 120'ye)
    const cardHeight = 280; // Daha kompakt (300'den 280'e)
    
    // Kart arka planı
    doc
      .roundedRect(cardLeft, startY, cardWidth, cardHeight, 12)
      .fill('#FFFFFF')
      .lineWidth(2.5)
      .stroke(orange);
    
    // İçerik başlığı
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(dark)
      .text('Etkinlik Bileti', cardLeft + cardWidth / 2, startY + 25, { align: 'center' });
    
    // Bilet kodu (sağ üst)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(orange)
      .text(`Kod: ${ticket.code}`, cardLeft + cardWidth - 25, startY + 25, { align: 'right' });
    
    // Bilgiler
    const infoLeft = cardLeft + 40;
    let infoY = startY + 60;
    
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(dark);
    
    // Etkinlik başlığı
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(ticket.ticket.event.title, infoLeft, infoY, {
        width: cardWidth - 80,
        ellipsis: true
      });
    
    infoY += 35;
    
    // Ayırıcı çizgi
    doc
      .moveTo(infoLeft, infoY - 10)
      .lineTo(cardLeft + cardWidth - 40, infoY - 10)
      .lineWidth(0.5)
      .stroke(gray)
      .opacity(0.3);
    
    infoY += 20;
    doc.font('Helvetica').fontSize(12);
    
    // Tarih
    doc.text(`Tarih: ${new Date(ticket.ticket.event.date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, infoLeft, infoY);
    
    infoY += 28;
    
    // Yer (varsa)
    if ((ticket.ticket.event as any).location) {
      doc.text(`Yer: ${(ticket.ticket.event as any).location}`, infoLeft, infoY);
      infoY += 28;
    }
    
    // Açıklama (kısaltılmış - tek sayfa garantisi için daha kısa)
    if (ticket.ticket.event.description) {
      const desc = ticket.ticket.event.description.length > 80 
        ? ticket.ticket.event.description.substring(0, 80) + '...'
        : ticket.ticket.event.description;
      doc
        .fontSize(11)
        .fillColor(gray)
        .text(desc, infoLeft, infoY, {
          width: cardWidth - 80,
          lineGap: 2, // Daha kompakt (3'ten 2'ye)
        });
      infoY += 35; // Daha kompakt (40'tan 35'e)
    } else {
      infoY += 15; // Daha kompakt (20'den 15'e)
    }
    
    // Katılımcı
    doc
      .fontSize(12)
      .fillColor(dark)
      .text(`Katılımcı: ${ticket.user.fullName || ticket.user.username}`, infoLeft, infoY);
    infoY += 25;
    
    // E-posta
    doc.text(`E-posta: ${ticket.user.email}`, infoLeft, infoY, {
      width: cardWidth - 80,
      ellipsis: true
    });
    infoY += 25;
    
    // Durum
    const statusText = ticket.used ? 'Durum: Kullanıldı' : 'Durum: Aktif';
    const statusColor = ticket.used ? '#ef4444' : '#10b981';
    doc
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(statusText, infoLeft, infoY);

    // 🧡 QR Kod (Ortalanmış, kartın altında)
    if (ticket.qrUrl) {
      try {
        const tmpDir = '/tmp';
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        const qrPath = path.join(tmpDir, `${ticket.code}-qr.png`);
        const base64Data = ticket.qrUrl.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(qrPath, base64Data, 'base64');
        
            // ✅ Tek sayfa garantisi için QR kod pozisyonunu optimize et
        const qrSize = 120; // Daha küçük (130'dan 120'ye)
        const qrX = doc.page.width / 2 - qrSize / 2;
        const qrY = startY + cardHeight + 25; // Daha yakın (30'dan 25'e)
        
        // ✅ QR çerçevesi - Kontrastı arttırılmış turuncu çerçeve
        const borderWidth = 3; // Kalın çerçeve
        const borderPadding = 8; // Padding
        
        // Dış turuncu çerçeve (daha belirgin kontrast için)
        doc
          .roundedRect(
            qrX - borderPadding, 
            qrY - borderPadding, 
            qrSize + (borderPadding * 2), 
            qrSize + (borderPadding * 2), 
            10
          )
          .lineWidth(borderWidth)
          .stroke(orange)
          .fill('#FFFFFF'); // Beyaz arka plan (daha iyi kontrast)
        
        // İç beyaz arka plan (QR kod için)
        doc
          .roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 6)
          .fill('#FFFFFF');
        
        doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });
        
        doc
          .fontSize(10) // Daha kompakt (11'den 10'a)
          .font('Helvetica-Bold')
          .fillColor(dark)
          .text('QR Kod', doc.page.width / 2, qrY + qrSize + 15, { align: 'center' }); // Daha yakın (20'den 15'e)
        
        fs.unlinkSync(qrPath);
      } catch (error) {
        console.error('QR kod yuklenemedi:', error);
      }
    }

    // 💬 Alt Bilgi (Ortalanmış) - Tek sayfa garantisi için optimize
    const footerY = doc.page.height - 60; // Daha yakın (70'den 60'a)
    
    // Ayırıcı çizgi
    doc
      .moveTo(60, footerY - 5)
      .lineTo(doc.page.width - 60, footerY - 5)
      .lineWidth(0.5)
      .stroke(gray)
      .opacity(0.3);
    
    // ✅ Türkçe karakter desteği için UTF-8 encoding
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(gray)
      .text(
        'Bu bilet Feellink tarafından dijital olarak oluşturulmuştur.',
        doc.page.width / 2,
        footerY,
        { align: 'center', width: doc.page.width - 120 }
      );
    
    doc
      .fontSize(8)
      .fillColor(gray)
      .opacity(0.6)
      .text(
        'QR kodu girişte okutunuz.',
        doc.page.width / 2,
        footerY + 15,
        { align: 'center' }
      );
    
    doc
      .fontSize(7)
      .fillColor(gray)
      .opacity(0.5)
      .text(
        'Feellink - Sanatı, Teknolojiyle Buluştur',
        doc.page.width / 2,
        doc.page.height - 20,
        { align: 'center' }
      );

    // ✅ Tek sayfa garantisi - Fazladan sayfaları kaldır
    // pdfkit otomatik sayfa eklemezken, içeriği tek sayfaya sığdırdığımızdan emin oluyoruz
    doc.end();
  }
}

