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
        const user = request.user;

        const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
        const skipAuthHandler = this.reflector.get<boolean>(SKIP_AUTHORIZATION_KEY, context.getHandler());
        const skipAuthClass = this.reflector.get<boolean>(SKIP_AUTHORIZATION_KEY, context.getClass());

        if (isPublic || skipAuthHandler || skipAuthClass) {
            return true;
        }

        if (!user) {
            throw new UnauthorizedException('Vui lòng đăng nhập để tiếp tục!');
        }

        const resource = this.reflector.get<string>('resource', context.getClass());
        const action = this.reflector.get<string>('action', context.getHandler());

        if (!action) {
            if (user.role === 'admin') return true;
            throw new ForbiddenException('API này chưa được phân quyền. Vui lòng liên hệ Admin!');
        }

        const actions = action.split('|');

        const hasPermission = await this.authService.checkPermission(user.userId, resource, actions);

        if (!hasPermission) {
            throw new ForbiddenException(`Bạn không có quyền [${actions.join(', ')}] trên tài nguyên [${resource}]`);
        }

        return true;
    }
}