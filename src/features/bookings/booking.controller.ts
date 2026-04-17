import { Controller, Post, Body, Get, Param, Patch, Query } from '@nestjs/common';
import { BookingsService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ResponseApi } from '../../shared/dto/response.dto';
import { Auth, ResourceMeta, ActionMeta, type TokenInfo } from 'src/shared/decorator/custom.decorator';
import { QueryBookingDto } from './dto/query-booking.dto';
import { BookingStatus } from 'src/shared/constant/constant';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { API_ACTION } from 'src/shared/constant/constant'; // 👈 Import Enum
import { AddExtraServicesDto } from './dto/add-extra-service.dto';
@Controller('bookings')
@ResourceMeta('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    // ================= KHÁCH HÀNG (USER) ================= //

    @Post()
    @ActionMeta(API_ACTION.CREATE) // 👈 Hành động Tạo
    async create(
        @Auth() user: TokenInfo,
        @Body() createBookingDto: CreateBookingDto
    ) {
        const data = await this.bookingsService.createBooking(user, createBookingDto);
        return ResponseApi.create(data, 'Đặt phòng thành công!');
    }

    @Get('my-bookings')
    @ActionMeta(API_ACTION.READ) // 👈 Hành động Đọc
    async getMyBookings(@Auth() user: TokenInfo) {
        const data = await this.bookingsService.getMyBookings(user);
        return ResponseApi.create(data, 'Lấy lịch sử đặt phòng thành công!');
    }

    @Patch('cancel/:id')
    @ActionMeta(API_ACTION.CANCEL) // 👈 Hành động Cập nhật (Hủy đơn)
    async cancelBooking(
        @Param('id') bookingId: string,
        @Auth() user: TokenInfo
    ) {
        const data = await this.bookingsService.cancelBooking(bookingId, user);
        return ResponseApi.create(data, 'Hủy đặt phòng thành công!');
    }

    // ================= LỄ TÂN / ADMIN ================= //

    @Get()
    @ActionMeta(API_ACTION.MANAGE)
    async getAllBookings(@Query() request: QueryBookingDto) {
        const data = await this.bookingsService.getAllBookings(request);
        return ResponseApi.create(data, 'Lấy danh sách toàn bộ đơn đặt phòng thành công!');
    }

    @Patch('confirm/:id')
    @ActionMeta(API_ACTION.MANAGE)
    async confirmBooking(
        @Param('id') bookingId: string,
        @Body() payload: UpdateBookingStatusDto,
        @Auth() admin: TokenInfo
    ) {
        payload.status = BookingStatus.CONFIRMED;
        const data = await this.bookingsService.updateBookingStatus(bookingId, payload, admin);
        return ResponseApi.create(data, 'Đã xác nhận đơn đặt phòng!');
    }

    @Patch('check-in/:id')
    @ActionMeta(API_ACTION.MANAGE)
    async checkInBooking(@Param('id') bookingId: string, @Auth() admin: TokenInfo) {
        const data = await this.bookingsService.handleCheckIn(bookingId, admin);
        return ResponseApi.create(data, 'Check-in thành công. Đã giao phòng cho khách!');
    }

    @Patch('check-out/:id')
    @ActionMeta(API_ACTION.MANAGE)
    async checkOutBooking(@Param('id') bookingId: string, @Auth() admin: TokenInfo) {
        const data = await this.bookingsService.handleCheckOut(bookingId, admin);
        return ResponseApi.create(data, 'Check-out thành công. Hoàn tất giao dịch!');
    }


    @Post(':id/extra-services')
    @ActionMeta(API_ACTION.UPDATE)
    async addServices(
        @Param('id') bookingId: string,
        @Body() payload: AddExtraServicesDto // Nhận mảng items
    ) {
        const data = await this.bookingsService.addExtraServices(bookingId, payload);
        return ResponseApi.create(data, 'Đã cập nhật dịch vụ thành công!');
    }
}