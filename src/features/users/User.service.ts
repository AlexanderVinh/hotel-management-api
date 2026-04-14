import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { QueryService } from 'src/shared/service/query.service';
import { PasswordService } from 'src/shared/service/password.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        private readonly passwordService: PasswordService,
        private readonly queryService: QueryService) {
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.userModel.findOne({ email: createUserDto.email }).exec();
        if (existingUser) {
            throw new BadRequestException('Email này đã được đăng ký!');
        }

        const { password, ...rest } = createUserDto;
        const hashedPassword = await this.passwordService.hashPassword(password);
        const userToSave = {
            ...rest,
            passwordHash: hashedPassword,
        };

        const newUser = new this.userModel(userToSave);
        return await newUser.save();
    }

    // Trong UsersService
    async findAll(queryDto: QueryUserDto): Promise<any> {
        const { page, size } = queryDto;
        const skip = (page - 1) * size;

        // Nhờ QueryService tự động build cục filter!
        const filter = await this.queryService.buildQuery(queryDto);

        const [data, total] = await Promise.all([
            this.userModel.find(filter).skip(skip).limit(size).select('-passwordHash').exec(),
            this.userModel.countDocuments(filter).exec()
        ]);

        return { data, meta: { total, page, size } };
    }

    async findByEmail(email: string): Promise<any> {
        return await this.userModel.findOne({ email }).exec();
    }

    // Thêm vào dưới hàm findByEmail
    async findById(id: string): Promise<any> {
        return await this.userModel.findById(id).exec();
    }
}