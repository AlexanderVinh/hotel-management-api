import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) { }

    async sendInvoiceEmail(toEmail: string, pdfBuffer: Buffer, bookingCode: string) {
        try {
            await this.mailerService.sendMail({
                to: toEmail,
                subject: `Hóa đơn thanh toán - Đặt phòng ${bookingCode}`,
                html: `
                    <h3>Kính gửi Quý khách,</h3>
                    <p>Cảm ơn Quý khách đã tin tưởng và lựa chọn lưu trú tại Khách sạn Mini.</p>
                    <p>Chúng tôi xin gửi đính kèm hóa đơn điện tử cho mã đặt phòng <b>${bookingCode}</b> của Quý khách.</p>
                    <br>
                    <p>Hy vọng sẽ được đón tiếp Quý khách trong những dịp tới.</p>
                    <p>Trân trọng,</p>
                    <p><b>Ban Quản Lý Khách Sạn</b></p>
                `,
                attachments: [
                    {
                        filename: `Hoa_Don_${bookingCode}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });
        } catch (error) {
            console.error(`[MailService] Lỗi khi gửi mail:`, error);
        }
    }
}