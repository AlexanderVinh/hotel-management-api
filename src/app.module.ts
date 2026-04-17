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

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    DashboardModule,
    ServicesModule,
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
    AppService],
})
export class AppModule { }
