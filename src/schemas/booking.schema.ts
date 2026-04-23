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
    bookingCode: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId; // Ai là người đặt?

    @Prop([{
        roomId: { type: Types.ObjectId, ref: 'Room', required: true },
        priceAtBooking: { type: Number, required: true },
    }])
    rooms: Array<{ roomId: Types.ObjectId; priceAtBooking: number }>;

    @Prop({ required: true })
    checkInDate: Date;

    @Prop({ required: true })
    checkOutDate: Date;

    @Prop([
        {
            serviceId: { type: Types.ObjectId, ref: 'Service', required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true, min: 1 },
            addedAt: { type: Date, default: Date.now }
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
    totalPrice: number;

    @Prop({ type: Number, default: 0, min: 0 })
    paidAmount: number;

    @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
    status: BookingStatus;

    @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
    paymentStatus: PaymentStatus;

    @Prop({ type: String })
    note: string;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);