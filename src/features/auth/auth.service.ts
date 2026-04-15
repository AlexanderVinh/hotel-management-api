// src/features/auth/auth.service.ts
import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // <-- Import thêm JwtService
import { PasswordService } from '../../shared/service/password.service';
import { TokenService } from '../../shared/service/token.service';
import { LoginDto } from './dto/login.dto';
import { TokenType } from '../../schemas/token.schema';
import { CreateTokenDto } from '../../shared/dto/token.dto';
import { UsersService } from '../users/User.service';
import { HOTEL_ACCESS_EXPIRED_IN, HOTEL_REFRESH_EXPIRED_IN, HOTEL_ACCESS_SECRET_KEY, HOTEL_REFRESH_SECRET_KEY } from 'src/config';
import { UserRole } from 'src/shared/constant/constant';

@Injectable()
export class AuthService {
    constructor(
        @Inject(forwardRef(() => UsersService)) // 👈 Thêm lệnh này
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

    async checkPermission(userId: string, resource: string, actions: string[]): Promise<boolean> {
        const user = await this.usersService.findById(userId);
        if (!user || user.isDeleted) return false;

        // ==========================================
        // 1. QUYỀN TỐI CAO: ADMIN (Chủ khách sạn)
        // ==========================================
        if (user.role === UserRole.ADMIN) {
            return true; // Qua trạm thu phí không cần dừng
        }

        // ==========================================
        // 2. QUYỀN VẬN HÀNH: STAFF (Lễ tân, Nhân viên)
        // ==========================================
        if (user.role === UserRole.STAFF) {
            // Staff được Đọc, Sửa, và Quản lý (MANAGE) đơn đặt phòng
            if (resource === 'bookings' && actions.every(a => ['READ', 'UPDATE', 'MANAGE'].includes(a))) {
                return true;
            }

            // Lễ tân được Xem và Sửa Phòng (Đổi trạng thái dọn dẹp), nhưng KHÔNG ĐƯỢC XÓA PHÒNG
            if (resource === 'rooms' && actions.every(a => ['READ', 'UPDATE', 'CREATE'].includes(a))) {
                return true;
            }

            return false; // Chặn các tài nguyên khác chưa khai báo
        }

        // ==========================================
        // 3. QUYỀN CƠ BẢN: GUEST (Khách hàng vãng lai/Đã đăng ký)
        // ==========================================
        if (user.role === UserRole.GUEST) {
            // Khách được: Xem phòng (READ)
            if (resource === 'bookings' && actions.every(a => ['READ', 'CREATE', 'CANCEL'].includes(a))) {
                return true;
            }

            // Khách được: Đặt phòng (CREATE), Xem lịch sử của mình (READ), Hủy phòng (UPDATE)
            if (resource === 'bookings' && actions.every(a => ['READ', 'CREATE', 'UPDATE'].includes(a))) {
                return true;
            }

            // Tuyệt đối không cho Guest đụng vào danh sách Users
            if (resource === 'users') {
                return false;
            }

            return false;
        }

        // Mặc định an toàn: Đóng cửa mọi trường hợp không khớp
        return false;
    }
}

