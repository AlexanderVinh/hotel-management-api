import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRoomDto {
    @IsOptional()
    @Type(() => Number)
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
    roomNumber?: string; // Lễ tân gõ số phòng để tìm nhanh

    @IsOptional()
    @IsString()
    type?: string; // Lọc theo loại phòng (SINGLE, DOUBLE, VIP...)

    @IsOptional()
    @IsString()
    status?: string; // Lọc theo trạng thái (AVAILABLE, OCCUPIED, MAINTENANCE...)
}