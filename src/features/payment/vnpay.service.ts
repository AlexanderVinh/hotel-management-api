import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import moment from 'moment';
import * as qs from 'qs';
import { PaymentTransaction } from 'src/schemas/payment-transaction.schema';
import { PaymentStatus } from 'src/shared/constant/constant';
import { VNP_HASH_SECRET, VNP_TMN_CODE, VNP_URL, VNP_RETURN_URL } from 'src/config';
import { TokenInfo } from 'src/shared/decorator/custom.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BookingsService } from '../bookings/booking.service';

@Injectable()
export class VnpayService {
    constructor(
        @InjectModel(PaymentTransaction.name) private transactionModel: Model<PaymentTransaction>,
        private readonly bookingsService: BookingsService
    ) { }
    async createPaymentUrl(
        user: TokenInfo,
        payload: CreatePaymentDto,
        ip: string
    ): Promise<string> {
        const { amount, bookingRef } = payload;
        const userId = user.userId;

        // Tạo mã giao dịch duy nhất (Thêm milisecond để tránh trùng lặp khi test nhanh)
        const vnp_TxnRef = moment().format('DDHHmmssSSS');
        const secretKey = VNP_HASH_SECRET.trim();

        if (!VNP_TMN_CODE || !VNP_HASH_SECRET || !VNP_URL || !VNP_RETURN_URL) {
            throw new Error('Thiếu cấu hình VNPay trong biến môi trường (.env)');
        }

        // Lưu lịch sử vào Database (Sử dụng field 'booking' thay vì 'bookingId' theo chuẩn của bạn)
        await this.transactionModel.create({
            booking: new Types.ObjectId(bookingRef),
            user: new Types.ObjectId(userId),
            vnp_TxnRef: vnp_TxnRef,
            amount: amount,
            status: PaymentStatus.PENDING
        });

        let vnp_Params: any = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = VNP_TMN_CODE;
        vnp_Params['vnp_Locale'] = 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = vnp_TxnRef;
        vnp_Params['vnp_OrderInfo'] = `Thanh_toan_booking_${bookingRef}`;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = VNP_RETURN_URL;
        vnp_Params['vnp_IpAddr'] = ip === '::1' || !ip ? '127.0.0.1' : ip;
        vnp_Params['vnp_CreateDate'] = moment().format('YYYYMMDDHHmmss');

        // Băm chữ ký
        const signed = this.generateSignature(vnp_Params, secretKey);

        // Tạo URL cuối cùng (Chữ ký LUÔN nằm cuối cùng)
        const queryUrl = qs.stringify(this.sortObject(vnp_Params), { encode: false });
        const finalUrl = `${VNP_URL}?${queryUrl}&vnp_SecureHash=${signed}`;

        return finalUrl;
    }

    async vnpayIpn(query: any): Promise<any> {
        let vnp_Params = { ...query };
        const secureHash = vnp_Params['vnp_SecureHash'];
        const secretKey = VNP_HASH_SECRET.trim();

        // Xóa các tham số chữ ký trước khi băm kiểm tra
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        // Băm lại để đối chiếu
        const signed = this.generateSignature(vnp_Params, secretKey);

        if (secureHash !== signed) {
            console.error('--- ❌ SAI CHỮ KÝ IPN ---');
            return { RspCode: '97', Message: 'Checksum failed' };
        }

        const txnRef = vnp_Params['vnp_TxnRef'];
        const amount = Number(vnp_Params['vnp_Amount']) / 100;
        const rspCode = vnp_Params['vnp_ResponseCode'];

        const transaction = await this.transactionModel.findOne({ vnp_TxnRef: txnRef });

        if (!transaction) {
            return { RspCode: '01', Message: 'Order not found' };
        }

        if (transaction.amount !== amount) {
            return { RspCode: '04', Message: 'Invalid amount' };
        }

        if (transaction.status !== PaymentStatus.PENDING) {
            return { RspCode: '02', Message: 'Order already confirmed' };
        }

        // Cập nhật trạng thái
        if (rspCode === '00') {
            transaction.status = PaymentStatus.SUCCESS;
            // Gọi service booking để cập nhật trạng thái PAID
            await this.bookingsService.updatePaymentStatus(
                transaction.booking.toString(),
                'PAID'
            );
        } else {
            transaction.status = PaymentStatus.FAILED;
        }

        await transaction.save();
        return { RspCode: '00', Message: 'Confirm Success' };
    }

    private generateSignature(params: any, secret: string): string {
        // Gọt sạch khoảng trắng từng value trước khi băm
        const cleanParams = {};
        for (const key in params) {
            cleanParams[key] = String(params[key]).trim();
        }

        const sortedParams = this.sortObject(cleanParams);
        const signData = qs.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secret);
        return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    }

    private sortObject(obj: any) {
        const sorted: any = {};
        const str: string[] = [];
        let key;
        for (key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
        }
        return sorted;
    }
}