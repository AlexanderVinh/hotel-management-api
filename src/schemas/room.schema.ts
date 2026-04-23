import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RoomStatus, RoomType } from 'src/shared/constant/constant';

export type RoomDocument = Room & Document;

@Schema({
    timestamps: true,
    collection: 'rooms'
})
export class Room {
    @Prop({ required: true, unique: true, trim: true })
    roomNumber: string;

    @Prop({ required: true, enum: RoomType, default: RoomType.SINGLE })
    type: RoomType;

    @Prop({ required: true, min: 0 })
    pricePerNight: number;

    @Prop({ required: true, min: 1, default: 2 })
    capacity: number;

    @Prop({ required: true, enum: RoomStatus, default: RoomStatus.AVAILABLE })
    status: RoomStatus;

    @Prop([{ type: String }])
    amenities: string[];

    @Prop({ type: String })
    description: string;

    @Prop({ default: false })
    isDeleted: boolean;
}

// Chuyển đổi Class thành Mongoose Schema
export const RoomSchema = SchemaFactory.createForClass(Room);