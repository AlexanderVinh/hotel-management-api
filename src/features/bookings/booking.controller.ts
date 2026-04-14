import { Controller, Post, Body, Req, Get, Param, Patch } from '@nestjs/common';
import { BookingsService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ResponseApi } from '../../shared/dto/response.dto';

@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post()
    async create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
        const userId = req.user.userId;
        const data = await this.bookingsService.createBooking(userId, createBookingDto);

        return ResponseApi.create(data, 'Đặt phòng thành công!');
    }

    @Get('my-bookings')
    async getMyBookings(@Req() req: any) {
        const userId = req.user.userId;
        const data = await this.bookingsService.getMyBookings(userId);

        return ResponseApi.create(data, 'Lấy lịch sử đặt phòng thành công!');
    }

    @Patch(':id/cancel')
    async cancelBooking(@Req() req: any, @Param('id') bookingId: string) {
        const userId = req.user.userId;
        const data = await this.bookingsService.cancelBooking(bookingId, userId);

        return ResponseApi.create(data, 'Hủy đặt phòng thành công!');
    }
}