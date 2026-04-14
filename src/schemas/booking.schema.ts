import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

// 1. Định nghĩa các trạng thái của đơn đặt phòng
export enum BookingStatus {
    PENDING = 'PENDING',       // Chờ xử lý/Chờ đặt cọc
    CONFIRMED = 'CONFIRMED',   // Đã xác nhận/Đã đặt cọc
    CHECKED_IN = 'CHECKED_IN', // Khách đã nhận phòng
    CHECKED_OUT = 'CHECKED_OUT', // Khách đã trả phòng (Hoàn tất)
    CANCELLED = 'CANCELLED',   // Đã hủy
}

// 2. Định nghĩa trạng thái thanh toán
export enum PaymentStatus {
    UNPAID = 'UNPAID',     // Chưa thanh toán
    PARTIAL = 'PARTIAL',   // Thanh toán một phần (Đặt cọc)
    PAID = 'PAID',         // Đã thanh toán đủ
    REFUNDED = 'REFUNDED', // Đã hoàn tiền (Trường hợp hủy phòng)
}

@Schema({
    timestamps: true,
    collection: 'bookings'
})
export class Booking {
    @Prop({ required: true, unique: true, uppercase: true })
    bookingCode: string; // Mã đơn: BK-20260413-XYZ (Dễ tra cứu)

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId; // Ai là người đặt?

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

    @Prop({ required: true, min: 0 })
    totalAmount: number; // Tổng tiền cuối cùng

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