// src/features/users/dto/query-user.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../schemas/user.schema';
import { Pagination } from '../../../shared/dto/pagination.dto'; // Import file dùng chung

// Kế thừa toàn bộ thuộc tính (page, size, createdAt...) từ Pagination
export class QueryUserDto extends Pagination {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}