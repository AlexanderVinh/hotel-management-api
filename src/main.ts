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
  app.useGlobalInterceptors(new PostInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new CustomValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();