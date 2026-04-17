import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateServiceDto {
    @IsString()
    @IsNotEmpty({ message: 'Tên dịch vụ không được để trống' })
    name: string;

    @IsNumber({}, { message: 'Giá tiền phải là một số' })
    @Min(0, { message: 'Giá tiền không được âm' })
    price: number;

    @IsString()
    @IsOptional()
    description?: string;
}