import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { UserRole } from 'src/shared/constant/constant';

@Schema({ timestamps: true })
export class Permission extends Document {
    @Prop({ type: String, enum: UserRole, required: true })
    role: UserRole;

    @Prop({ required: true })
    resource: string;

    @Prop({ type: [String], default: [] })
    actions: string[];

    @Prop({ type: Boolean, default: true })
    active: boolean;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
    createdBy: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
    updatedBy: mongoose.Schema.Types.ObjectId;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

PermissionSchema.index({ role: 1, resource: 1 }, { unique: true });