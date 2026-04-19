import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer';

@Injectable()
export class InvoiceService {

    async generateInvoicePdf(booking: any): Promise<Buffer> {
        // 1. Khai báo đường dẫn tuyệt đối (an toàn khi chạy server)
        const templatePath = path.join(process.cwd(), 'src/templates/invoice.hbs');
        const cssPath = path.join(process.cwd(), 'src/templates/invoice.css');

        // 2. Đọc file HTML và CSS
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const styleCss = fs.readFileSync(cssPath, 'utf8');

        // 3. Xử lý và tính toán dữ liệu
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        // Tính số đêm ở
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) || 1;

        // Hàm tiện ích để format tiền tệ VNĐ
        const formatVND = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';

        // 4. Chuẩn bị Object dữ liệu để ném vào Handlebars
        const templateData = {
            style: styleCss, // 👈 Bơm CSS vào đây
            bookingCode: booking.bookingCode,
            printDate: new Date().toLocaleDateString('vi-VN'),
            userFullName: booking.userId?.fullName || 'Khách vãng lai',
            userEmail: booking.userId?.email || '',
            note: booking.note || 'Không có',
            checkInDate: checkIn.toLocaleDateString('vi-VN'),
            checkOutDate: checkOut.toLocaleDateString('vi-VN'),
            nights: nights,

            // Format lại mảng phòng
            rooms: booking.rooms.map((r: any) => ({
                roomNumber: r.roomId?.roomNumber || 'N/A',
                price: formatVND(r.priceAtBooking),
                totalRoomPrice: formatVND(r.priceAtBooking * nights)
            })),

            // Format lại mảng dịch vụ
            services: (booking.usedServices || []).map((s: any) => ({
                name: s.name,
                quantity: s.quantity,
                price: formatVND(s.price),
                totalServicePrice: formatVND(s.price * s.quantity)
            })),

            totalPrice: formatVND(booking.totalPrice)
        };

        // 5. Biên dịch và xuất PDF
        const template = handlebars.compile(templateHtml);
        const finalHtml = template(templateData);

        // Mở Puppeteer với cấu hình tối ưu cho server
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // waitUntil: 'networkidle0' đảm bảo HTML và CSS đã được render hoàn toàn trước khi in
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

        // Uint8Array trả về từ Puppeteer sẽ được bọc lại thành Buffer
        const pdfUint8Array = await page.pdf({
            format: 'A4',
            printBackground: true // Bắt buộc bật để hiển thị màu background của Table Header
        });

        await browser.close();

        return Buffer.from(pdfUint8Array);
    }
}