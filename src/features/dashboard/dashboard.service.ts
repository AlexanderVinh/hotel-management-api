import { Injectable } from '@nestjs/common';
import { BookingStatus } from 'src/shared/constant/constant';
import { RoomStatus } from 'src/shared/constant/constant';
import { RoomsService } from '../rooms/rooms.service';
import { BookingsService } from '../bookings/booking.service';

@Injectable()
export class DashboardService {
    constructor(
        private readonly bookingsService: BookingsService,
        private readonly roomsService: RoomsService,
    ) { }

    async getOverviewMetrics() {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const [
            pendingBookings,
            todayCheckIns,
            availableRooms,
            occupiedRooms
        ] = await Promise.all([
            this.bookingsService.countBookingsByStatus(BookingStatus.PENDING),
            this.bookingsService.countCheckInsBetween(startOfToday, endOfToday),
            this.roomsService.countRoomsByStatus(RoomStatus.AVAILABLE),
            this.roomsService.countRoomsByStatus(RoomStatus.OCCUPIED)
        ]);

        return {
            pendingBookings,
            todayCheckIns,
            availableRooms,
            occupiedRooms,
        };
    }

    async getRevenueStats() {
        return await this.bookingsService.getRevenueStats(30);
    }
}