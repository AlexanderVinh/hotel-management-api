// src/features/users/dto/query-user.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/shared/constant/constant';
import { Pagination } from '../../../shared/dto/pagination.dto'; // Import file dùng chung

export class QueryUserDto extends Pagination {
    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}