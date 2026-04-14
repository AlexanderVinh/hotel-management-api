import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { RoomsService } from '../rooms/rooms.service';

@Module({
    controllers: [BookingsController],
    providers: [BookingsService, RoomsService],
    exports: [BookingsService], // Export nếu sau này module Payment cần dùng
})
export class BookingsModule { }