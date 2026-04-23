import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { PaymentType, TransactionStatus } from 'src/shared/constant/constant';

@Schema({ timestamps: true })
export class PaymentTransaction extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
    booking: Types.ObjectId;

    @Prop({ required: true, unique: true, index: true })
    vnp_TxnRef: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ type: String, enum: PaymentType, required: true })
    paymentType: PaymentType;

    @Prop({ default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @Prop()
    vnp_TransactionNo?: string;

    @Prop()
    vnp_ResponseCode?: string;

    @Prop({ type: Object })
    rawResponse?: any;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);