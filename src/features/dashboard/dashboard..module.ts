import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RoomsModule } from '../rooms/rooms.module';
import { BookingsModule } from '../bookings/booking.module';

@Module({
    imports: [
        RoomsModule,
        BookingsModule
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }