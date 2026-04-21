// src/schemas/permission.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { UserRole } from 'src/shared/constant/constant';

@Schema({ timestamps: true })
export class Permission extends Document {
    @Prop({ type: String, enum: UserRole, required: true })
    role: UserRole; // ADMIN, STAFF, GUEST

    @Prop({ required: true })
    resource: string; // 'bookings', 'payments', 'rooms'...

    @Prop({ type: [String], default: [] })
    actions: string[]; // ['CREATE', 'READ', 'UPDATE'...]

    @Prop({ type: Boolean, default: true })
    active: boolean;

    // Tuân thủ quy tắc bỏ đuôi "Id" của bạn
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
    createdBy: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
    updatedBy: mongoose.Schema.Types.ObjectId;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

// Đảm bảo không có 2 bản ghi trùng Role và Resource
PermissionSchema.index({ role: 1, resource: 1 }, { unique: true });