import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from 'mongoose';
export enum UserRole {
    ADMIN = 'admin',
    STAFF = 'staff',
    GUEST = 'guest',
}

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true })
    fullName: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ required: true, unique: true })
    phoneNumber: string;

    @Prop({ type: String, enum: UserRole, default: UserRole.GUEST })
    role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);