// src/features/auth/auth.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/Users.module';

// Import các file dùng chung từ shared
import { PasswordService } from '../../shared/service/password.service';
import { TokenService } from '../../shared/service/token.service';

// Import strategy nếu bạn đã tạo ở bước trước (nếu chưa tạo thì bạn có thể comment dòng này lại)
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { UsersService } from '../users/User.service';
@Global()
@Module({
  imports: [
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    AccessTokenStrategy,
  ],
  exports: [AuthService]
})
export class AuthModule { }