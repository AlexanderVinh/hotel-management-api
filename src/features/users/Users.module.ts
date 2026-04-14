// src/features/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './Users.controller';
import { UsersService } from './User.service';
import { PasswordService } from 'src/shared/service/password.service';
import { QueryService } from 'src/shared/service/query.service';

@Module({
    imports: [],
    controllers: [UsersController],
    providers: [UsersService, PasswordService, QueryService],
    exports: [UsersService],
})
export class UsersModule { }