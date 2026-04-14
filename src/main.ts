// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PostInterceptor } from './shared/interceptors/post.interceptors';
import { CustomValidationPipe } from './shared/pipes/custom-validation.pipe';
import { AllExceptionsFilter } from './shared/filters/all-expection.filter';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // 1. Cài đặt Interceptor trước
  app.useGlobalInterceptors(new PostInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  // 2. Cài đặt Validation Pipe trước
  app.useGlobalPipes(new CustomValidationPipe());

  // 3. MỞ CỬA SERVER (Luôn nằm ở cuối cùng)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();