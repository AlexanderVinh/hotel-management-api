import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RoomStatus, RoomType } from 'src/shared/constant/constant';

export type RoomDocument = Room & Document;

@Schema({
    timestamps: true, // Tự động sinh createdAt và updatedAt
    collection: 'rooms' // Ép tên bảng trong MongoDB là 'rooms'
})
export class Room {
    @Prop({ required: true, unique: true, trim: true })
    roomNumber: string; // VD: "101", "A205"

    @Prop({ required: true, enum: RoomType, default: RoomType.SINGLE })
    type: RoomType;

    @Prop({ required: true, min: 0 })
    pricePerNight: number; // Giá mỗi đêm

    @Prop({ required: true, min: 1, default: 2 })
    capacity: number; // Sức chứa tối đa (Số người)

    @Prop({ required: true, enum: RoomStatus, default: RoomStatus.AVAILABLE })
    status: RoomStatus;

    @Prop([{ type: String }])
    amenities: string[]; // Các tiện ích: ["Wi-Fi", "TV", "Điều hòa"]

    @Prop({ type: String })
    description: string; // Mô tả thêm về phòng

    @Prop({ default: false })
    isDeleted: boolean;
}

// Chuyển đổi Class thành Mongoose Schema
export const RoomSchema = SchemaFactory.createForClass(Room);