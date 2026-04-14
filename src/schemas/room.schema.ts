import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoomDocument = Room & Document;

// 1. Định nghĩa các Enum chuẩn để ép kiểu dữ liệu chặt chẽ (Không cho phép nhập lung tung)
export enum RoomType {
    SINGLE = 'SINGLE', // Phòng đơn
    DOUBLE = 'DOUBLE', // Phòng đôi
    SUITE = 'SUITE',   // Phòng cao cấp
    DELUXE = 'DELUXE', // Phòng siêu sang
}

export enum RoomStatus {
    AVAILABLE = 'AVAILABLE',     // Sẵn sàng đón khách
    OCCUPIED = 'OCCUPIED',       // Đang có khách ở
    MAINTENANCE = 'MAINTENANCE', // Đang bảo trì / dọn dẹp
}

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