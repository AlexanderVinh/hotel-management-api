// src/features/auth/auth.controller.ts
import { Controller, Post, Body, Get, BadRequestException, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { COOKIE_DOMAIN, COOKIE_NAME, COOKIE_SECURE } from '../../config';
import type { Response } from 'express';
import { PublicMeta, Auth } from 'src/shared/decorator/custom.decorator';

// 👇 Import bảo vật mới vào
import { ResponseApi } from '../../shared/dto/response.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @PublicMeta()
    @Post('login')
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response
    ) {
        const data = await this.authService.login(loginDto);

        res.cookie(COOKIE_NAME, data.tokens.accessToken, {
            httpOnly: true,
            secure: COOKIE_SECURE,
            sameSite: 'lax',
            domain: COOKIE_DOMAIN,
            maxAge: 1000 * 60 * 60 * 24,
        });

        // 👇 BỌC LẠI BẰNG RESPONSE API
        return ResponseApi.create(data, 'Đăng nhập thành công!');
    }

    @Get('me')
    getProfile(@Auth() user: any) {
        return ResponseApi.create(user, 'Lấy thông tin cá nhân thành công!');
    }

    @PublicMeta()
    @Post('refresh')
    async refreshTokens(
        @Body('refreshToken') refreshToken: string,
        @Res({ passthrough: true }) res: Response
    ) {
        if (!refreshToken) {
            throw new BadRequestException('Vui lòng cung cấp refreshToken');
        }

        const data = await this.authService.refreshToken(refreshToken);

        res.cookie(COOKIE_NAME, data.accessToken, {
            httpOnly: true,
            secure: COOKIE_SECURE,
            sameSite: 'lax',
            domain: COOKIE_DOMAIN,
            maxAge: 1000 * 60 * 60 * 24,
        });

        return ResponseApi.create(data, 'Cấp lại thẻ mới thành công!');
    }
}