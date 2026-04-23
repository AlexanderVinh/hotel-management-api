import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UsersService } from './User.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

import { ResourceMeta, ActionMeta, PublicMeta } from 'src/shared/decorator/custom.decorator';
import { API_ACTION } from 'src/shared/constant/constant';
import { ResponseApi } from 'src/shared/dto/response.dto';

@Controller('users')
@ResourceMeta('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    @PublicMeta()
    @ActionMeta(API_ACTION.CREATE)
    async register(@Body() createUserDto: CreateUserDto) {
        const data = await this.usersService.create(createUserDto);

        return ResponseApi.create(data, 'Đăng ký tài khoản thành công!');
    }

    @Get()
    @ActionMeta(API_ACTION.MANAGE)
    async getAllUsers(@Query() queryUserDto: QueryUserDto) {
        const data = await this.usersService.findAll(queryUserDto);

        return ResponseApi.create(data, 'Lấy danh sách người dùng thành công!');
    }
}