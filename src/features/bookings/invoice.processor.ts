import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvoiceService } from '../../shared/invoice/invoice.service';
import { MailService } from '../../shared/mail/mail.service';

@Processor('invoice-queue') // Tên của Hàng đợi
export class InvoiceProcessor {
    constructor(
        @InjectModel('Booking') private bookingModel: Model<any>, // Chỉnh lại type Model nếu cần
        private readonly invoiceService: InvoiceService,
        private readonly mailService: MailService,
    ) { }

    @Process('send-invoice-job')
    async handleSendInvoice(job: Job<{ bookingId: string }>) {
        const { bookingId } = job.data;
        try {
            // 1. Lấy dữ liệu đầy đủ nhất để in hóa đơn
            const booking = await this.bookingModel.findById(bookingId)
                .populate('user', 'fullName email')
                .populate('rooms.roomId', 'roomNumber type price') // Lấy thêm giá phòng
                .exec();

            // 2. Bảo vệ: Nếu không có mail thì dừng
            if (!booking || !booking.user?.email) {
                console.log(`[Queue] ⚠️ Bỏ qua đơn ${bookingId} vì không tìm thấy email khách hàng.`);
                return;
            }

            console.log(`[Queue] 📝 Đang tạo hóa đơn PDF cho mã đơn: ${booking.bookingCode}`);

            const pdfBuffer = await this.invoiceService.generateInvoicePdf(booking);

            await this.mailService.sendInvoiceEmail(
                booking.user.email,
                pdfBuffer,
                booking.bookingCode
            );

            console.log(`[Queue] ✅ Thành công! Hóa đơn đã bay đến: ${booking.user.email}`);
        } catch (error) {
            console.error(`[Queue] ❌ Lỗi xử lý hóa đơn đơn ${bookingId}:`, error);
            throw error;
        }
    }
}
