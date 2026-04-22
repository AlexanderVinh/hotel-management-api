import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import moment from 'moment';
import { PaymentTransaction } from 'src/schemas/payment-transaction.schema';
import {
    TransactionStatus,
    PaymentStatus,
    PaymentType,
    BookingStatus
} from 'src/shared/constant/constant';

import { VNP_HASH_SECRET, VNP_TMN_CODE, VNP_URL, VNP_RETURN_URL } from 'src/config';
import { TokenInfo } from 'src/shared/decorator/custom.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BookingsService } from '../bookings/booking.service';
import { InjectQueue } from '@nestjs/bull';
import { type Queue } from 'bull';

@Injectable()
export class VnpayService {
    constructor(
        @InjectModel(PaymentTransaction.name) private transactionModel: Model<PaymentTransaction>,
        @InjectQueue('invoice-queue') private invoiceQueue: Queue,
        private readonly bookingsService: BookingsService
    ) { }

    async createPaymentUrl(user: TokenInfo, payload: CreatePaymentDto, ip: string): Promise<string> {
        const { bookingRef, paymentType } = payload;
        const booking = await this.bookingsService.findOne(bookingRef);
        if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng');

        let finalAmount = 0;
        if (paymentType === PaymentType.DEPOSIT) {
            finalAmount = Math.round(booking.totalPrice * 0.3);
        } else {
            finalAmount = booking.totalPrice - (booking.paidAmount || 0);
        }
        if (finalAmount <= 0) throw new BadRequestException('Đơn hàng đã thanh toán đủ');

        const vnp_TxnRef = moment().format('DDHHmmssSSS');
        const secretKey = VNP_HASH_SECRET.trim().replace(/^["']|["']$/g, '');

        await this.transactionModel.create({
            booking: new Types.ObjectId(bookingRef),
            user: new Types.ObjectId(user.userId),
            vnp_TxnRef: vnp_TxnRef,
            amount: finalAmount,
            status: TransactionStatus.PENDING,
            paymentType: paymentType
        });

        const vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = VNP_TMN_CODE;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = vnp_TxnRef;
        vnp_Params['vnp_OrderInfo'] = `Thanh_toan_${paymentType}_cho_booking_${bookingRef}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = Math.floor(finalAmount * 100);
        vnp_Params['vnp_ReturnUrl'] = VNP_RETURN_URL;
        vnp_Params['vnp_IpAddr'] = '127.0.0.1';
        vnp_Params['vnp_CreateDate'] = moment().format('YYYYMMDDHHmmss');

        // 🎯 TÍNH CHỮ KÝ (Sử dụng hàm băm mã hóa thống nhất)
        const signed = this.computeVnpayHash(vnp_Params, secretKey);

        // 🎯 TẠO URL CUỐI CÙNG (Dùng chính quy tắc encode đã băm)
        const queryUrl = Object.keys(vnp_Params)
            .sort()
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(vnp_Params[key])).replace(/%20/g, "+")}`)
            .join('&');

        const finalUrl = `${VNP_URL}?${queryUrl}&vnp_SecureHash=${signed}`;

        console.log('--- 🚀 URL GỬI ĐI ---');
        console.log(finalUrl);
        return finalUrl;
    }

    async vnpayIpn(query: any): Promise<any> {
        let vnp_Params = { ...query };
        const secureHash = vnp_Params['vnp_SecureHash'];

        // 1. Dọn dẹp params
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        // 2. Tính lại chữ ký (Sử dụng hàm vạn năng ở trên)
        const signed = this.computeVnpayHash(vnp_Params, VNP_HASH_SECRET);

        if (secureHash !== signed) {
            console.error('--- ❌ SAI CHỮ KÝ IPN ---');
            console.log('Mã VNPay gửi:', secureHash);
            console.log('Server tính ra:', signed);
            return { RspCode: '97', Message: 'Checksum failed' };
        }

        // --- BẮT ĐẦU XỬ LÝ NGHIỆP VỤ KHI CHỮ KÝ ĐÃ KHỚP ---

        const txnRef = vnp_Params['vnp_TxnRef'];
        const amount = Number(vnp_Params['vnp_Amount']) / 100;
        const rspCode = vnp_Params['vnp_ResponseCode'];

        // Tìm giao dịch trong Database
        const transaction = await this.transactionModel.findOne({ vnp_TxnRef: txnRef });
        if (!transaction) return { RspCode: '01', Message: 'Order not found' };

        // Kiểm tra xem giao dịch đã được xác nhận thành công trước đó chưa
        if (transaction.status !== TransactionStatus.PENDING) {
            return { RspCode: '02', Message: 'Order already confirmed' };
        }

        if (rspCode === '00') {
            transaction.status = TransactionStatus.SUCCESS;
            const booking = await this.bookingsService.findOne(transaction.booking.toString());

            if (booking) {
                const newPaidAmount = (booking.paidAmount || 0) + amount;
                const newPaymentStatus = (newPaidAmount >= booking.totalPrice)
                    ? PaymentStatus.PAID
                    : PaymentStatus.PARTIAL;

                const updateData: any = {
                    paidAmount: newPaidAmount,
                    paymentStatus: newPaymentStatus,
                };

                // Logic tự động hoàn tất đơn (Check-out tự động)
                if (newPaymentStatus === PaymentStatus.PAID && booking.status === BookingStatus.CHECKED_IN) {
                    updateData.status = BookingStatus.COMPLETED;
                    updateData.checkOutDate = new Date(); // Ghi nhận thời điểm check-out thực tế
                }
                else if (booking.status === BookingStatus.PENDING) {
                    updateData.status = BookingStatus.CONFIRMED;
                }

                await this.bookingsService.updatePaymentAfterVnpay(
                    booking._id.toString(),
                    updateData
                );

                // 🎯 KÍCH HOẠT GỬI HÓA ĐƠN: Chỉ gửi khi đã thanh toán đủ (PAID)
                if (newPaymentStatus === PaymentStatus.PAID) {
                    await this.invoiceQueue.add('send-invoice-job', {
                        bookingId: booking._id.toString()
                    });
                    console.log(`[VNPAY] 🚀 Đã đẩy đơn ${booking.bookingCode} vào hàng đợi gửi hóa đơn.`);
                }
            }
        } else {
            console.log('--- ⚠️ GIAO DỊCH THẤT BẠI ---');
            transaction.status = TransactionStatus.FAILED;
        }

        // Lưu lại trạng thái giao dịch thanh toán
        await transaction.save();

        return { RspCode: '00', Message: 'Confirm Success' };
    }

    /**
     * HÀM BĂM CHUẨN VNPAY 2.1.0
     * Quy tắc: Sort Alphabet -> Encode Key & Value -> Replace %20 thành + -> HmacSHA512
     */
    private computeVnpayHash(params: any, secret: string): string {
        const secretKey = secret.trim().replace(/^["']|["']$/g, '');
        const sortedKeys = Object.keys(params).sort();

        const signData = sortedKeys
            .map((key) => {
                const value = params[key];
                if (value !== "" && value !== null && value !== undefined) {
                    // Ép kiểu String và Encode đúng chuẩn VNPAY 2.1.0
                    return `${encodeURIComponent(key)}=${encodeURIComponent(String(value)).replace(/%20/g, "+")}`;
                }
            })
            .filter(Boolean)
            .join('&');

        console.log('--- 🛡️ CHUỖI MANG ĐI BĂM (DEBUG) ---');
        console.log(signData);

        const hmac = crypto.createHmac('sha512', secretKey);
        return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    }
}