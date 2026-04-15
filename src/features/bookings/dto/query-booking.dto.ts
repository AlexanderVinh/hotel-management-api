import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBookingDto {
    @IsOptional()
    @Type(() => Number) // Tự động ép kiểu URL string sang Number
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    size?: number = 10;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    bookingCode?: string; // Giúp Lễ tân gõ mã đơn vào ô tìm kiếm
}