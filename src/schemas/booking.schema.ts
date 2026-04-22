import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BookingStatus, PaymentStatus } from 'src/shared/constant/constant';

export type BookingDocument = Booking & Document;

@Schema({
    timestamps: true,
    collection: 'bookings'
})
export class Booking {
    @Prop({ required: true, unique: true, uppercase: true })
    bookingCode: string; // Mã đơn: BK-20260413-XYZ (Dễ tra cứu)

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId; // Ai là người đặt?

    // 👇 CHIẾN LƯỢC SNAPSHOT: Lưu thông tin phòng và giá tại thời điểm đặt
    @Prop([{
        roomId: { type: Types.ObjectId, ref: 'Room', required: true },
        priceAtBooking: { type: Number, required: true }, // Giá chốt, không đổi dù sau này phòng tăng giá
    }])
    rooms: Array<{ roomId: Types.ObjectId; priceAtBooking: number }>;

    @Prop({ required: true })
    checkInDate: Date;

    @Prop({ required: true })
    checkOutDate: Date;

    @Prop([
        {
            serviceId: { type: Types.ObjectId, ref: 'Service', required: true },
            name: { type: String, required: true }, // Lưu lại tên lúc gọi
            price: { type: Number, required: true }, // Lưu lại giá lúc gọi
            quantity: { type: Number, required: true, min: 1 },
            addedAt: { type: Date, default: Date.now } // Thời điểm gọi đồ
        }
    ])
    usedServices: {
        serviceId: Types.ObjectId;
        name: string;
        price: number;
        quantity: number;
        addedAt: Date;
    }[];

    @Prop({ required: true, min: 0 })
    totalPrice: number; // Tổng tiền cuối cùng

    @Prop({ type: Number, default: 0, min: 0 })
    paidAmount: number; // Số tiền thực tế khách ĐÃ trả (qua VNPay hoặc tiền mặt)

    @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
    status: BookingStatus;

    @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
    paymentStatus: PaymentStatus;

    @Prop({ type: String })
    note: string; // Ghi chú của khách

    @Prop({ default: false })
    isDeleted: boolean; // Xóa mềm
}

export const BookingSchema = SchemaFactory.createForClass(Booking);