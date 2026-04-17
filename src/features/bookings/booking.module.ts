import { forwardRef, Module } from '@nestjs/common';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { RoomsService } from '../rooms/rooms.service';
import { ServicesModule } from '../services/service.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
    imports: [
        ServicesModule,
        RoomsModule,
    ],
    controllers: [BookingsController],
    providers: [BookingsService],
    exports: [BookingsService], // Export nếu sau này module Payment cần dùng
})
export class BookingsModule { }