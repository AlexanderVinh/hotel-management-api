import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export enum TokenType {
    ACCESS_TOKEN = 'access_token',
    REFRESH_TOKEN = 'refresh_token',
}

@Schema({ timestamps: true })
export class Token extends Document {
    @Prop()
    tokenId: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ enum: TokenType, default: TokenType.ACCESS_TOKEN })
    type: string;

    @Prop()
    expiredAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
