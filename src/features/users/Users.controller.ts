import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UsersService } from './User.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        return await this.usersService.create(createUserDto);
    }

    @Get()
    async getAllUsers(@Query() queryUserDto: QueryUserDto) {
        return await this.usersService.findAll(queryUserDto);
    }
}