import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from './database.module';
import { UsersModule } from './features/users/Users.module';
import { AuthModule } from './features/auth/auth.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { RoomsModule } from './features/rooms/rooms.module';
import { BookingsModule } from './features/bookings/booking.module';
import { PermissionGuard } from './shared/guards/permission.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DashboardModule } from './features/dashboard/dashboard..module';
import { ServicesModule } from './features/services/service.module';
import { MailModule } from './shared/mail/mail.module';
import { InvoiceService } from './shared/invoice/invoice.service';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from './shared/redis/redis.module';
import { CacheModule } from './shared/cache/cache.module';
import { PaymentModule } from './features/payment/payment.module';
import { SharedQueueModule } from './shared/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    DashboardModule,
    ServicesModule,
    MailModule,
    RedisModule,
    CacheModule,
    PaymentModule,
    SharedQueueModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    AppService,
    InvoiceService],
})
export class AppModule { }
