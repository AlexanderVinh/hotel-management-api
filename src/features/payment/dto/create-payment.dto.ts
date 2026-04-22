import { IsNotEmpty, IsEnum, IsMongoId, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { PaymentType } from 'src/shared/constant/constant'; // Import từ constant
export class CreatePaymentDto {
    @IsNotEmpty()
    @IsString()
    @IsMongoId({ message: 'Mã booking phải là định dạng ObjectId hợp lệ của MongoDB' })
    bookingRef: string;

    @IsNotEmpty()
    @IsEnum(PaymentType, { message: 'Loại thanh toán phải là FULL hoặc DEPOSIT' })
    paymentType: PaymentType;

    @IsOptional() // Không bắt buộc Client gửi lên nữa, Backend sẽ tự tính
    @IsNumber()
    @Min(10000)
    amount?: number;
}