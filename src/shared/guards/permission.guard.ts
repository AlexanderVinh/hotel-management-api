import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_AUTHORIZATION_KEY } from '../constant/constant'; // Chỉnh lại đường dẫn nếu cần
import { AuthService } from '../../features/auth/auth.service'; // Chỉnh lại đường dẫn import AuthService của bạn

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user; // TokenInfo đã được nhét vào đây từ JwtStrategy

        // 1. Kiểm tra các API công khai
        const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
        const skipAuthHandler = this.reflector.get<boolean>(SKIP_AUTHORIZATION_KEY, context.getHandler());
        const skipAuthClass = this.reflector.get<boolean>(SKIP_AUTHORIZATION_KEY, context.getClass());

        if (isPublic || skipAuthHandler || skipAuthClass) {
            return true;
        }

        // Nếu chưa đăng nhập mà dám mò vào API đóng -> Chặn
        if (!user) {
            throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục!');
        }

        // 2. Lấy Resource (Tài nguyên) và Action (Hành động)
        const resource = this.reflector.get<string>('resource', context.getClass());
        const action = this.reflector.get<string>('action', context.getHandler());

        // Nếu API không cắm biển Action -> Mặc định cho qua
        if (!action) {
            if (user.role === 'admin') return true;
            throw new ForbiddenException('API này chưa được phân quyền. Vui lòng liên hệ Admin!');
        }

        // 3. Tách chuỗi Action (Ví dụ: 'READ|CREATE' -> ['READ', 'CREATE'])
        const actions = action.split('|');

        // 4. Nhờ AuthService kiểm tra Database
        const hasPermission = await this.authService.checkPermission(user.userId, resource, actions);

        if (!hasPermission) {
            throw new ForbiddenException(`Bạn không có quyền [${actions.join(', ')}] trên tài nguyên [${resource}]`);
        }

        return true;
    }
}