import { IsString, IsArray, IsDateString, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateBookingDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Bạn phải chọn ít nhất 1 phòng' })
    @ArrayMaxSize(5, { message: 'Một đơn đặt phòng tối đa được chọn 5 phòng' }) // 👈 Giải quyết yêu cầu tối đa
    roomIds: string[];

    @IsDateString()
    checkInDate: string;

    @IsDateString()
    checkOutDate: string;

    @IsString()
    @IsOptional()
    note?: string;
}