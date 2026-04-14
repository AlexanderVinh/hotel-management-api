// src/shared/decorators/custom.decorator.ts
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SKIP_AUTHORIZATION_KEY } from '../constant/constant'; // Bạn nhớ tạo file constant này nếu chưa có nhé

// 1. Đồng bộ tên với học viện
export const PublicMeta = () => SetMetadata('isPublic', true);
export const RefreshMeta = () => SetMetadata('refresh', true);
export const SyncMeta = () => SetMetadata('sync', true);
export const SkipAuthorization = () => SetMetadata(SKIP_AUTHORIZATION_KEY, true);

// 2. Hệ thống phân quyền nâng cao (PBAC) của học viện
export const ResourceMeta = (resource: string) => SetMetadata('resource', resource);
export const ActionMeta = (action: string) => SetMetadata('action', action);
export const ServiceMetaData = (service: any) => SetMetadata('service', service);
// Thêm tem Roles để check quyền Admin / User nhanh gọn
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 3. Giữ lại hàm Auth siêu việt của chúng ta (kết hợp với Interface của học viện)
export interface TokenInfo {
    userId: string;
    role: string;
}

export const Auth = createParamDecorator(
    (data: keyof TokenInfo, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as TokenInfo;

        return data ? user?.[data] : { ...user };
    },
);