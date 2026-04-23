import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Pagination } from '../../../shared/dto/pagination.dto'; // 👈 Import đúng class của bạn

export class QueryServiceDto extends Pagination {

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