// src/features/bookings/dto/query-booking.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/shared/dto/pagination.dto'; // Đảm bảo đúng đường dẫn

export class QueryBookingDto extends Pagination {
    @IsOptional()
    @IsString()
    status?: string; // 👈 Khai báo để Service không báo đỏ khi gọi request.status

    @IsOptional()
    @IsString()
    bookingCode?: string; // 👈 Khai báo để Service không báo đỏ khi gọi request.bookingCode
}