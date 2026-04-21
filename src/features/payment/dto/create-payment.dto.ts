import { IsNotEmpty, IsNumber, Min, IsMongoId, IsString } from 'class-validator';

export class CreatePaymentDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(10000, { message: 'Số tiền thanh toán tối thiểu phải từ 10.000 VNĐ trở lên' })
    amount: number;

    @IsNotEmpty()
    @IsString()
    @IsMongoId({ message: 'Mã booking phải là định dạng ObjectId hợp lệ của MongoDB' })
    bookingRef: string;
}