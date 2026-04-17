import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Pagination } from '../../../shared/dto/pagination.dto'; // 👈 Import đúng class của bạn

// Thừa hưởng toàn bộ page, size, from, to... từ class Pagination
export class QueryServiceDto extends Pagination {

    // Chỉ khai báo thêm những tiêu chí tìm kiếm RIÊNG của bảng Dịch vụ
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;
}