// src/shared/service/token.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import ms from 'ms';
import { Token } from '../../schemas/token.schema';
import { CreateTokenDto } from '../dto/token.dto'; // Dùng DTO y như học viện

@Injectable()
export class TokenService {
    constructor(
        @InjectModel(Token.name) private readonly tokenModel: Model<Token>,
    ) { }

    async create(payload: CreateTokenDto) {
        // Tạm hardcode '7d', sau này bạn có thể đưa vào file config như học viện
        const expiredAt = new Date(Date.now() + ms('7d' as ms.StringValue));

        await this.tokenModel.create({
            ...payload,
            userId: new Types.ObjectId(payload.userId), // Ép kiểu để không lỗi DB
            expiredAt,
        });
    }

    async findOne(userId: string, tokenId: string) {
        return this.tokenModel.findOne({
            userId: new Types.ObjectId(userId),
            tokenId,
        }).lean();
    }

    async remove(id: string) {
        await this.tokenModel.deleteOne({ _id: new Types.ObjectId(id) });
    }
} 