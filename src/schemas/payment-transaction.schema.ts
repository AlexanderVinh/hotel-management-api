import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { PaymentStatus } from 'src/shared/constant/constant';

@Schema({ timestamps: true })
export class PaymentTransaction extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
    booking: Types.ObjectId;

    @Prop({ required: true })
    vnp_TxnRef: string; // Mã tham chiếu giao dịch (duy nhất cho mỗi lần tạo link)

    @Prop({ required: true })
    amount: number;

    @Prop({ default: PaymentStatus.PENDING })
    status: PaymentStatus;

    @Prop()
    vnp_TransactionNo?: string; // Mã giao dịch do VNPay trả về sau khi thành công

    @Prop()
    vnp_ResponseCode?: string; // Mã phản hồi từ VNPay (00 là thành công)

    @Prop({ type: Object })
    rawResponse?: any; // Lưu toàn bộ data VNPay gửi về để đối soát sau này

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId; // Thêm dòng này để trỏ về User

}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);