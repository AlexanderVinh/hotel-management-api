import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus, PaymentStatus } from 'src/shared/constant/constant';

export class UpdateBookingStatusDto {
    @IsEnum(BookingStatus, { message: 'Trạng thái booking không hợp lệ' })
    status: BookingStatus;

    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'Trạng thái thanh toán không hợp lệ' })
    paymentStatus?: PaymentStatus;

    @IsOptional()
    @IsString()
    note?: string; // Lễ tân có thể ghi chú thêm lý do hủy hoặc xác nhận
}