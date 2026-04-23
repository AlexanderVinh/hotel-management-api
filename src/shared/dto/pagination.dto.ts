import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGE_SIZE, PAGE, PAGE_SIZE } from '../constant/constant';

export class Pagination {
    @IsOptional()
    @Type(() => Number)
    @Transform(({ value }) => (value && value !== null && value !== undefined && value !== '' ? Number(value) : PAGE))
    @IsNumber()
    @Min(1)
    page: number = PAGE;

    @IsOptional()
    @Type(() => Number)
    @Transform(({ value }) => (value && value !== null && value !== undefined && value !== '' ? Number(value) : PAGE_SIZE))
    @IsNumber()
    @Min(1)
    @Max(MAX_PAGE_SIZE, { message: `Số lượng bản ghi lấy lên không được vượt quá ${MAX_PAGE_SIZE}` })
    size: number = PAGE_SIZE;

    @IsOptional()
    from?: string;
    @IsOptional()
    to?: string;
    @IsOptional()
    createdAtFrom?: string;
    @IsOptional()
    createdAtTo?: string;
    @IsOptional()
    updatedAtFrom?: string;
    @IsOptional()
    updatedAtTo?: string;
    @IsOptional()
    createdUser?: string;
    @IsOptional()
    updatedUser?: string;
}