// src/features/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // <-- Import thêm JwtService
import { PasswordService } from '../../shared/service/password.service';
import { TokenService } from '../../shared/service/token.service';
import { LoginDto } from './dto/login.dto';
import { TokenType } from '../../schemas/token.schema';
import { CreateTokenDto } from '../../shared/dto/token.dto';
import { UsersService } from '../users/User.service';
import { HOTEL_ACCESS_EXPIRED_IN, HOTEL_REFRESH_EXPIRED_IN, HOTEL_ACCESS_SECRET_KEY, HOTEL_REFRESH_SECRET_KEY } from 'src/config';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly passwordService: PasswordService,
        private readonly tokenService: TokenService,
        private readonly jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
        }

        const isPasswordValid = await this.passwordService.comparePasswords(
            loginDto.password,
            user.passwordHash,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
        }

        const userIdStr = user._id.toString();

        // Tự tay tạo Token tại đây bằng JwtService
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { userId: userIdStr, role: user.role },
                { expiresIn: HOTEL_ACCESS_EXPIRED_IN as any, secret: HOTEL_ACCESS_SECRET_KEY }
            ),
            this.jwtService.signAsync(
                { userId: userIdStr, role: user.role },
                { expiresIn: HOTEL_REFRESH_EXPIRED_IN as any, secret: HOTEL_REFRESH_SECRET_KEY }
            ),
        ]);

        // Gọi TokenService chỉ để lưu DB
        const tokenDto = new CreateTokenDto(userIdStr, refreshToken, TokenType.REFRESH_TOKEN);
        await this.tokenService.create(tokenDto);

        const userObj = user.toObject();
        delete userObj.passwordHash;

        return {
            user: userObj,
            tokens: { accessToken, refreshToken },
        };
    }


    async refreshToken(refreshToken: string) {
        try {
            const decoded = await this.jwtService.verifyAsync(refreshToken, {
                secret: HOTEL_REFRESH_SECRET_KEY as string,
            });

            const tokenExists = await this.tokenService.findOne(decoded.userId, refreshToken);
            if (!tokenExists) {
                throw new UnauthorizedException('Refresh Token không tồn tại hoặc đã bị thu hồi!');
            }

            const user = await this.usersService.findById(decoded.userId);
            if (!user) {
                throw new UnauthorizedException('Người dùng không tồn tại!');
            }

            const userIdStr = user._id.toString();

            const [newAccessToken, newRefreshToken] = await Promise.all([
                this.jwtService.signAsync(
                    { userId: userIdStr, role: user.role },
                    { expiresIn: HOTEL_ACCESS_EXPIRED_IN as any, secret: HOTEL_ACCESS_SECRET_KEY }
                ),
                this.jwtService.signAsync(
                    { userId: userIdStr, role: user.role },
                    { expiresIn: HOTEL_REFRESH_EXPIRED_IN as any, secret: HOTEL_REFRESH_SECRET_KEY }
                ),
            ]);

            const tokenDto = new CreateTokenDto(userIdStr, newRefreshToken, TokenType.REFRESH_TOKEN);
            await this.tokenService.create(tokenDto);

            await this.tokenService.remove(tokenExists._id.toString());

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã hết hạn!');
        }
    }
}