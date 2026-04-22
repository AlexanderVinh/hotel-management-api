import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer';

@Injectable()
export class InvoiceService {

    async generateInvoicePdf(booking: any): Promise<Buffer> {
        // 1. Khai báo đường dẫn
        const templatePath = path.join(process.cwd(), 'src/templates/invoice.hbs');
        const cssPath = path.join(process.cwd(), 'src/templates/invoice.css');

        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const styleCss = fs.readFileSync(cssPath, 'utf8');

        // 2. Tính toán số đêm
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) || 1;

        const formatVND = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

        const templateData = {
            style: styleCss,
            bookingCode: booking.bookingCode,
            printDate: new Date().toLocaleDateString('vi-VN'),
            userFullName: booking.user?.fullName || 'Khách vãng lai',
            userEmail: booking.user?.email || '',
            note: booking.note || 'Không có',
            checkInDate: checkIn.toLocaleDateString('vi-VN'),
            checkOutDate: checkOut.toLocaleDateString('vi-VN'),
            nights: nights,

            rooms: booking.rooms.map((r: any) => ({
                roomNumber: r.roomId?.roomNumber || 'N/A',
                price: formatVND(r.priceAtBooking),
                totalRoomPrice: formatVND(r.priceAtBooking * nights)
            })),

            services: (booking.usedServices || []).map((s: any) => ({
                name: s.name,
                quantity: s.quantity,
                price: formatVND(s.price),
                totalServicePrice: formatVND(s.price * s.quantity)
            })),

            totalPrice: formatVND(booking.totalPrice)
        };

        const template = handlebars.compile(templateHtml);
        const finalHtml = template(templateData);

        // 4. Puppeteer với Error Handling
        const browser = await puppeteer.launch({
            headless: true, // Chạy ngầm
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
            const page = await browser.newPage();
            // Đặt nội dung HTML
            await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

            // Xuất PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
            });

            return Buffer.from(pdfBuffer);
        } finally {
            // ✅ Đảm bảo đóng trình duyệt dù có lỗi hay không
            await browser.close();
        }
    }
}