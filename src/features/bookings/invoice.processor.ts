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
        console.log(`[Queue] 🚀 Đang xử lý hóa đơn cho đơn: ${bookingId}...`);

        try {
            // Lấy dữ liệu mới nhất từ DB
            const booking = await this.bookingModel.findById(bookingId)
                .populate('userId', 'fullName email')
                .populate('rooms.roomId', 'roomNumber type')
                .exec();

            if (!booking || !booking.userId?.email) {
                console.log(`[Queue] ⚠️ Bỏ qua đơn ${bookingId} vì không có email.`);
                return;
            }

            // Thực hiện công việc nặng nhọc
            const pdfBuffer = await this.invoiceService.generateInvoicePdf(booking);
            await this.mailService.sendInvoiceEmail(booking.userId.email, pdfBuffer, booking.bookingCode);

            console.log(`[Queue] ✅ Xong! Đã gửi hóa đơn thành công cho đơn ${bookingId}`);
        } catch (error) {
            console.error(`[Queue] ❌ Lỗi khi xử lý đơn ${bookingId}:`, error);
            throw error; // Báo lỗi để BullMQ biết mà thử lại (Retry)
        }
    }
}