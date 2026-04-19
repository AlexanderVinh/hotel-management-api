import { Injectable } from '@nestjs/common';
import { BookingStatus, RoomStatus } from 'src/shared/constant/constant';
import { RoomsService } from '../rooms/rooms.service';
import { BookingsService } from '../bookings/booking.service';
// Khuyên dùng thư viện moment-timezone hoặc dayjs để xử lý ngày giờ chuẩn xác
// import * as dayjs from 'dayjs'; 

@Injectable()
export class DashboardService {
    constructor(
        private readonly bookingsService: BookingsService,
        private readonly roomsService: RoomsService,
    ) { }

    async getOverviewMetrics() {
        // CÁCH AN TOÀN VỚI MÚI GIỜ (Nếu chưa dùng thư viện):
        // Chỉnh offset về UTC+7 (Việt Nam) nếu Server chạy UTC
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Chạy song song 5 truy vấn
        const [
            pendingBookings,
            todayCheckIns,
            availableRooms,
            occupiedRooms,
            maintenanceRooms // 👈 Thêm trạng thái Đang dọn
        ] = await Promise.all([
            this.bookingsService.countBookingsByStatus(BookingStatus.PENDING),
            this.bookingsService.countCheckInsBetween(startOfToday, endOfToday),
            this.roomsService.countRoomsByStatus(RoomStatus.AVAILABLE),
            this.roomsService.countRoomsByStatus(RoomStatus.OCCUPIED),
            this.roomsService.countRoomsByStatus(RoomStatus.MAINTENANCE)
        ]);

        return {
            bookings: {
                pending: pendingBookings,
                arrivingToday: todayCheckIns,
            },
            rooms: {
                available: availableRooms,
                occupied: occupiedRooms,
                maintenance: maintenanceRooms,
                total: availableRooms + occupiedRooms + maintenanceRooms // Tính luôn tổng phòng cho Frontend đỡ phải cộng
            }
        };
    }

    // 👈 Thêm tham số days, mặc định là 30 nếu Frontend không truyền
    async getRevenueStats(days: number = 30) {
        return await this.bookingsService.getRevenueStats(days);
    }
}