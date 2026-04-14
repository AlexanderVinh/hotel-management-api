import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // 1. Dùng Reflector soi thẳng vào chuỗi 'isPublic' theo đúng chuẩn học viện
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);

        // 2. Nếu có tem Public -> Nhắm mắt cho qua luôn
        if (isPublic) {
            return true;
        }

        // 3. Nếu không có tem Public -> Bắt buộc phải check Token
        return super.canActivate(context);
    }

    // Báo lỗi đẹp hơn nếu Token sai hoặc hết hạn
    handleRequest(err, user, info) {
        if (err || !user) {
            throw err || new UnauthorizedException('Bạn chưa đăng nhập hoặc Token đã hết hạn!');
        }
        return user;
    }
}