import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SKIP_AUTHORIZATION_KEY } from '../constant/constant'; // Bạn nhớ tạo file constant này nếu chưa có nhé

export const PublicMeta = () => SetMetadata('isPublic', true);
export const RefreshMeta = () => SetMetadata('refresh', true);
export const SyncMeta = () => SetMetadata('sync', true);
export const SkipAuthorization = () => SetMetadata(SKIP_AUTHORIZATION_KEY, true);

export const ResourceMeta = (resource: string) => SetMetadata('resource', resource);
export const ActionMeta = (action: string) => SetMetadata('action', action);
export const ServiceMetaData = (service: any) => SetMetadata('service', service);
// Thêm tem Roles để check quyền Admin / User nhanh gọn
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

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