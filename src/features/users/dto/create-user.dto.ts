// src/features/users/dto/create-user.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from 'src/shared/constant/constant';
import { LowerCase, Trim } from 'src/shared/decorator/transform.decorator';

export class CreateUserDto {
    @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Họ tên không được để trống' })
    @Trim()
    fullName!: string;

    @IsEmail({}, { message: 'Email không đúng định dạng' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    @LowerCase()
    email: string;

    @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    password: string;

    @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
    @Trim()
    phoneNumber: string;

    @IsOptional()
    @IsEnum(UserRole, { message: 'Quyền người dùng không hợp lệ' })
    role?: UserRole;
}