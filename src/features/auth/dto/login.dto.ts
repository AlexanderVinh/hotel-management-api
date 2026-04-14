import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @IsNotEmpty({ message: "Không được để trống email." })
  @IsString()
  readonly email: string;
  @IsNotEmpty({ message: "Không được để trống mật khẩu." })
  @IsString()
  readonly password: string;
}
