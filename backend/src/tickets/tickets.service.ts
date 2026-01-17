import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TicketMailerService } from './ticket-mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { generateCode, generateQrDataUrl } from './ticket.utils';
import PDFDocument from 'pdfkit';
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
    // ✅ Tek sayfa garantisi için optimize edilmiş ayarlar
    const doc = new PDFDocument({ 
      size: 'A4', // 210mm x 297mm
      margin: 40, // Daha kompakt margin (50'den 40'a)
      layout: 'portrait',
      bufferPages: false, // ✅ Fazladan sayfa oluşturmayı engelle
      autoFirstPage: true,
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

    // 🎨 Renk Paleti - PDF için optimize edilmiş koyu renkler
    const orange = '#ff7b00';
    const dark = '#111827'; // Neredeyse siyah - PDF için ideal (#1F2937 yerine daha koyu)
    const gray = '#374151'; // Koyu gri - alt metinler için (#1F2937 yerine)
    const grayLight = '#6B7280'; // Açık metinler için
    const white = '#FFFFFF';

    // 🟠 Üst Başlık Banner (Turuncu zemin) - Tek sayfa için optimize
    doc
      .rect(0, 0, doc.page.width, 70) // Daha kompakt (80'den 70'e)
      .fill(orange);
    
    doc
      .fillColor(white)
      .font('Helvetica-Bold')
      .fontSize(22) // Daha kompakt (24'ten 22'ye)
      .text('Feellink', doc.page.width / 2, 25, { align: 'center' });
    
    doc
      .fontSize(10) // Daha kompakt (11'den 10'a)
      .font('Helvetica')
      .fillColor(white)
      .opacity(1) // Opacity tam kapasite - daha okunabilir
      .text('Digital Art & Events Platform', doc.page.width / 2, 48, { align: 'center' });

    // 🧾 Bilgi Kutusu (Ortalanmış, kart tasarımı)
    // ✅ Tek sayfa garantisi için boyutları optimize et
    const cardWidth = 500;
    const cardLeft = (doc.page.width - cardWidth) / 2;
    const startY = 100; // Daha yakın (120'den 100'e)
    const cardHeight = 260; // Daha kompakt (280'den 260'a)
    
    // Kart arka planı
    doc
      .roundedRect(cardLeft, startY, cardWidth, cardHeight, 12)
      .fill('#FFFFFF')
      .lineWidth(2.5)
      .stroke(orange);
    
    // İçerik başlığı
    doc
      .font('Helvetica-Bold')
      .fontSize(17) // Daha kompakt
      .fillColor(dark)
      .opacity(1) // Opacity tam
      .text('Etkinlik Bileti', cardLeft + cardWidth / 2, startY + 20, { align: 'center' });
    
    // Bilet kodu (sağ üst)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(orange)
      .opacity(1)
      .text(`Kod: ${ticket.code}`, cardLeft + cardWidth - 25, startY + 20, { align: 'right' });
    
    // Bilgiler
    const infoLeft = cardLeft + 35;
    let infoY = startY + 55;
    
    doc
      .font('Helvetica')
      .fontSize(12) // Daha kompakt (13'ten 12'ye)
      .fillColor(dark)
      .opacity(1); // Opacity tam
    
    // Etkinlik başlığı
    doc
      .font('Helvetica-Bold')
      .fontSize(15) // Daha kompakt (16'dan 15'e)
      .fillColor(dark)
      .opacity(1)
      .text(ticket.ticket.event.title, infoLeft, infoY, {
        width: cardWidth - 70,
        ellipsis: true
      });
    
    infoY += 28; // Daha kompakt (35'ten 28'e)
    
    // Ayırıcı çizgi
    doc
      .moveTo(infoLeft, infoY - 8)
      .lineTo(cardLeft + cardWidth - 35, infoY - 8)
      .lineWidth(0.5)
      .stroke(gray)
      .opacity(0.4); // Biraz daha görünür
    
    infoY += 18; // Daha kompakt (20'den 18'e)
    doc.font('Helvetica').fontSize(11); // Daha kompakt (12'den 11'e)
    
    // Tarih
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
    
    infoY += 22; // Daha kompakt (28'den 22'ye)
    
    // Yer (varsa)
    if ((ticket.ticket.event as any).location) {
      doc
        .fillColor(dark)
        .opacity(1)
        .text(`Yer: ${(ticket.ticket.event as any).location}`, infoLeft, infoY);
      infoY += 22; // Daha kompakt (28'den 22'ye)
    }
    
    // Açıklama (kısaltılmış - tek sayfa garantisi için daha kısa)
    if (ticket.ticket.event.description) {
      const desc = ticket.ticket.event.description.length > 70 
        ? ticket.ticket.event.description.substring(0, 70) + '...'
        : ticket.ticket.event.description;
      doc
        .fontSize(10) // Daha kompakt (11'den 10'a)
        .fillColor(gray)
        .opacity(1) // Opacity tam - daha okunabilir
        .text(desc, infoLeft, infoY, {
          width: cardWidth - 70,
          lineGap: 1, // Daha kompakt (2'den 1'e)
        });
      infoY += 28; // Daha kompakt (35'ten 28'e)
    } else {
      infoY += 12; // Daha kompakt (15'ten 12'ye)
    }
    
    // Katılımcı
    doc
      .fontSize(11) // Daha kompakt (12'den 11'e)
      .fillColor(dark)
      .opacity(1)
      .text(`Katılımcı: ${ticket.user.fullName || ticket.user.username}`, infoLeft, infoY);
    infoY += 20; // Daha kompakt (25'ten 20'ye)
    
    // E-posta
    doc
      .fillColor(dark)
      .opacity(1)
      .text(`E-posta: ${ticket.user.email}`, infoLeft, infoY, {
        width: cardWidth - 70,
        ellipsis: true
      });
    infoY += 20; // Daha kompakt (25'ten 20'ye)
    
    // Durum
    const statusText = ticket.used ? 'Durum: Kullanıldı' : 'Durum: Aktif';
    const statusColor = ticket.used ? '#dc2626' : '#059669'; // Daha koyu renkler
    doc
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .opacity(1)
      .text(statusText, infoLeft, infoY);

    // 🧡 QR Kod (Ortalanmış, kartın altında) - Tek sayfa garantisi
    if (ticket.qrUrl) {
      try {
        const tmpDir = '/tmp';
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        const qrPath = path.join(tmpDir, `${ticket.code}-qr.png`);
        const base64Data = ticket.qrUrl.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(qrPath, base64Data, 'base64');
        
        // ✅ Tek sayfa garantisi için QR kod pozisyonunu dinamik hesapla
        const qrSize = 100; // Daha küçük (110'dan 100'e) - tek sayfa için
        const qrX = doc.page.width / 2 - qrSize / 2;
        // Kartın bitişinden sonra minimal boşluk, footer'dan önce yer kalacak şekilde
        const qrY = startY + cardHeight + 15; // Daha yakın (20'den 15'e)
        
        // Tek sayfa kontrolü - QR + footer toplam yüksekliği kontrol et
        const qrTotalHeight = qrSize + 15 + 10; // QR + text + spacing
        const footerHeight = 50;
        const totalNeededHeight = qrY + qrTotalHeight + footerHeight;
        
        // Eğer sayfa boyutunu aşarsa, QR'ı daha yukarı kaydır
        const maxAllowedY = doc.page.height - footerHeight - qrTotalHeight - 10;
        const finalQrY = Math.min(qrY, maxAllowedY);
        
        // ✅ QR çerçevesi - Kontrastı arttırılmış turuncu çerçeve
        const borderWidth = 2.5;
        const borderPadding = 5; // Daha kompakt (6'dan 5'e)
        
        // Dış turuncu çerçeve
        doc
          .roundedRect(
            qrX - borderPadding, 
            finalQrY - borderPadding, 
            qrSize + (borderPadding * 2), 
            qrSize + (borderPadding * 2), 
            8
          )
          .lineWidth(borderWidth)
          .stroke(orange)
          .fill('#FFFFFF');
        
        // İç beyaz arka plan (QR kod için)
        doc
          .roundedRect(qrX - 1, finalQrY - 1, qrSize + 2, qrSize + 2, 5)
          .fill('#FFFFFF');
        
        doc.image(qrPath, qrX, finalQrY, { width: qrSize, height: qrSize });
        
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(dark) // Koyu renk - okunabilir
          .opacity(1) // Opacity tam
          .text('QR Kod', doc.page.width / 2, finalQrY + qrSize + 10, { align: 'center' }); // Daha yakın (12'den 10'a)
        
        fs.unlinkSync(qrPath);
      } catch (error) {
        console.error('QR kod yuklenemedi:', error);
      }
    }

    // 💬 Alt Bilgi (Ortalanmış) - Tek sayfa garantisi için optimize
    const footerY = doc.page.height - 45; // Daha yakın (50'den 45'e)
    
    // Ayırıcı çizgi
    doc
      .moveTo(50, footerY - 5)
      .lineTo(doc.page.width - 50, footerY - 5)
      .lineWidth(0.5)
      .stroke(gray)
      .opacity(0.4);
    
    // ✅ Türkçe karakter desteği için UTF-8 encoding - Koyu renkler
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(gray) // Koyu gri (#374151) - okunabilir
      .opacity(1) // Opacity tam
      .text(
        'Bu bilet Feellink tarafından dijital olarak oluşturulmuştur.',
        doc.page.width / 2,
        footerY,
        { align: 'center', width: doc.page.width - 100 }
      );
    
    doc
      .fontSize(8)
      .fillColor(gray) // Koyu gri (#374151)
      .opacity(1) // Opacity tam
      .text(
        'QR kodu girişte okutunuz.',
        doc.page.width / 2,
        footerY + 10, // Daha yakın (12'den 10'a)
        { align: 'center' }
      );
    
    doc
      .fontSize(7)
      .fillColor(grayLight) // Açık gri (#6B7280) ama yine de okunabilir
      .opacity(1)
      .text(
        'Feellink - Sanatı, Teknolojiyle Buluştur',
        doc.page.width / 2,
        doc.page.height - 15, // Daha yakın (18'den 15'e)
        { align: 'center' }
      );

    // ✅ Tek sayfa garantisi - Fazladan sayfaları kaldır
    // pdfkit otomatik sayfa eklemezken, içeriği tek sayfaya sığdırdığımızdan emin oluyoruz
    doc.end();
  }
}

