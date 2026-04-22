import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as querystring from 'qs'; // 👈 Dùng qs để parse URL chuẩn xác hơn
import moment from 'moment';
import { PaymentTransaction } from 'src/schemas/payment-transaction.schema';
import { TransactionStatus, PaymentStatus, PaymentType, BookingStatus } from 'src/shared/constant/constant';
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

        await this.transactionModel.create({
            booking: new Types.ObjectId(bookingRef),
            user: new Types.ObjectId(user.userId),
            vnp_TxnRef: vnp_TxnRef,
            amount: finalAmount,
            status: TransactionStatus.PENDING,
            paymentType: paymentType
        });

        // 🎯 Chuẩn bị Data
        let vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = VNP_TMN_CODE;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = vnp_TxnRef;
        vnp_Params['vnp_OrderInfo'] = `Thanh_toan_${paymentType}_cho_booking_${bookingRef}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = finalAmount * 100;
        vnp_Params['vnp_ReturnUrl'] = VNP_RETURN_URL;
        vnp_Params['vnp_IpAddr'] = ip || '127.0.0.1'; // 👈 Nên lấy IP thật thay vì hardcode
        vnp_Params['vnp_CreateDate'] = moment().format('YYYYMMDDHHmmss');

        // 🎯 Sắp xếp và tạo chữ ký theo hàm chuẩn
        vnp_Params = this.sortObject(vnp_Params);
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const signed = this.computeVnpayHash(signData, VNP_HASH_SECRET);

        vnp_Params['vnp_SecureHash'] = signed;
        const finalUrl = VNP_URL + '?' + querystring.stringify(vnp_Params, { encode: false });

        console.log('--- 🚀 URL GỬI ĐI ---');
        console.log(finalUrl);
        return finalUrl;
    }

    async vnpayIpn(query: any): Promise<any> {
        try { // 🎯 MỤC 2: Bọc try...catch toàn bộ logic
            let vnp_Params = { ...query };
            const secureHash = vnp_Params['vnp_SecureHash'];

            // 1. Xóa các trường Hash và sắp xếp
            delete vnp_Params['vnp_SecureHash'];
            delete vnp_Params['vnp_SecureHashType'];
            vnp_Params = this.sortObject(vnp_Params);

            // 2. Tự nối chuỗi và băm (Dùng hàm compute chung)
            let signData = '';
            for (const key in vnp_Params) {
                if (Object.prototype.hasOwnProperty.call(vnp_Params, key)) {
                    signData += `${key}=${vnp_Params[key]}&`;
                }
            }
            if (signData.length > 0) signData = signData.slice(0, -1);

            const signed = this.computeVnpayHash(signData, VNP_HASH_SECRET);

            // 3. Kiểm tra chữ ký
            if (secureHash !== signed) {
                console.error('--- ❌ SAI CHỮ KÝ IPN ---');
                return { RspCode: '97', Message: 'Fail checksum' };
            }

            const txnRef = vnp_Params['vnp_TxnRef'];
            const amount = Number(vnp_Params['vnp_Amount']) / 100;
            const rspCode = vnp_Params['vnp_ResponseCode'];

            // 4. ATOMIC UPDATE: Khóa giao dịch ngay lập tức để chống Race Condition
            const transaction = await this.transactionModel.findOneAndUpdate(
                { vnp_TxnRef: txnRef, status: TransactionStatus.PENDING },
                { status: rspCode === '00' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED },
                { new: true }
            );

            if (!transaction) {
                const exist = await this.transactionModel.exists({ vnp_TxnRef: txnRef });
                if (exist) return { RspCode: '02', Message: 'Order already confirmed' };
                return { RspCode: '01', Message: 'Order not found' };
            }

            // 5. Xử lý logic Booking
            if (rspCode === '00') {
                const booking = await this.bookingsService.findOne(transaction.booking.toString());
                if (booking) {
                    const newPaidAmount = (booking.paidAmount || 0) + amount;
                    const isFullyPaid = newPaidAmount >= booking.totalPrice;

                    const updateData: any = {
                        paidAmount: newPaidAmount,
                        paymentStatus: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
                    };

                    // Check-out tự động nếu đã thanh toán đủ
                    if (isFullyPaid && booking.status === BookingStatus.CHECKED_IN) {
                        updateData.status = BookingStatus.COMPLETED;
                        updateData.checkOutDate = new Date();
                    } else if (booking.status === BookingStatus.PENDING) {
                        updateData.status = BookingStatus.CONFIRMED;
                    }

                    await this.bookingsService.updatePaymentAfterVnpay(booking._id.toString(), updateData);

                    if (isFullyPaid) {
                        await this.invoiceQueue.add(
                            'send-invoice-job',
                            { bookingId: booking._id.toString() },
                            {
                                jobId: `invoice_${booking._id.toString()}`,
                                removeOnComplete: true,
                                attempts: 3,
                                backoff: 5000,
                            }
                        );
                        console.log(`[VNPAY] 🚀 Đã đẩy job invoice_${booking._id.toString()} vào Queue.`);
                    }
                }
            }

            return { RspCode: '00', Message: 'success' };

        } catch (error) {
            // 🎯 MỤC 2: Trả về lỗi 99 để VNPAY biết và gọi lại (Retry) sau
            console.error('--- ❌ LỖI HỆ THỐNG IPN ---', error);
            return { RspCode: '99', Message: 'Unknown error' };
        }
    }

    private sortObject(obj: any): any {
        let sorted: any = {};
        let str: string[] = [];
        let key: string;

        for (key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                str.push(encodeURIComponent(key));
            }
        }

        str.sort();

        for (let i = 0; i < str.length; i++) {
            sorted[str[i]] = encodeURIComponent(String(obj[str[i]])).replace(/%20/g, "+");
        }

        return sorted;
    }

    private computeVnpayHash(signData: string, secret: string): string {
        const secretKey = secret.trim().replace(/^["']|["']$/g, '');
        const hmac = crypto.createHmac('sha512', secretKey);
        return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    }


}