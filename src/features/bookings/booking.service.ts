import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { BookingDocument, BookingStatus } from '../../schemas/booking.schema';
import { RoomDocument } from '../../schemas/room.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class BookingsService {
    constructor(
        @InjectModel('Booking') private bookingModel: Model<BookingDocument>,
        private readonly roomsService: RoomsService,
        @InjectConnection() private connection: Connection, // Dùng để mở Transaction
    ) { }

    async createBooking(userId: string, payload: CreateBookingDto) {
        const { roomIds, checkInDate, checkOutDate, note } = payload;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const now = new Date();

        // 1. CHỐNG SPAM & LOGIC THỜI GIAN
        if (checkIn < now) throw new BadRequestException('Ngày nhận phòng không thể ở trong quá khứ!');
        if (checkIn >= checkOut) throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng!');

        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        if (nights > 30) throw new BadRequestException('Chỉ được đặt tối đa 30 đêm!');

        const daysInAdvance = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysInAdvance > 180) throw new BadRequestException('Chỉ được đặt trước tối đa 6 tháng!');

        // KHỞI ĐỘNG DATABASE TRANSACTION (Chống Race-condition / Overbooking)
        // const session = await this.connection.startSession();
        // session.startTransaction();

        try {
            // 2. KIỂM TRA TRANH CHẤP PHÒNG (Bỏ .session)
            const overlappingBookings = await this.bookingModel.find({
                'rooms.roomId': { $in: roomIds },
                status: { $nin: [BookingStatus.CANCELLED, BookingStatus.CHECKED_OUT] },
                checkInDate: { $lt: checkOut },
                checkOutDate: { $gt: checkIn }
            }).lean(); // 👈 Đã xóa .session(session)

            if (overlappingBookings.length > 0) {
                throw new BadRequestException('Một hoặc nhiều phòng bạn chọn đã có người đặt trong thời gian này!');
            }

            // 3. LẤY SNAPSHOT GIÁ CỦA PHÒNG (Bỏ tham số session)
            const rooms = await this.roomsService.findByIds(roomIds); // 👈 Đã xóa session

            if (rooms.length !== roomIds.length) {
                throw new BadRequestException('Có phòng không tồn tại hoặc đã bị khóa!');
            }

            let totalAmount = 0;
            const roomSnapshots = rooms.map(room => {
                totalAmount += (room.pricePerNight * nights);
                return {
                    roomId: room._id,
                    priceAtBooking: room.pricePerNight
                };
            });

            // 4. TẠO HÓA ĐƠN
            const dateString = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const bookingCode = `BK-${dateString}-${randomStr}`;

            const newBooking = new this.bookingModel({
                bookingCode,
                userId,
                rooms: roomSnapshots,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                totalAmount,
                note,
            });

            // Bỏ { session } khi save
            await newBooking.save();

            // await session.commitTransaction();
            return newBooking;

        } catch (error) {
            // await session.abortTransaction();
            throw error;
        } finally {
            // session.endSession();
        }
    }

    // --- CÁC HÀM TIỆN ÍCH CƠ BẢN ---

    async getMyBookings(userId: string) {
        return this.bookingModel.find({ userId })
            .populate('rooms.roomId', 'roomNumber type') // Lấy thêm số phòng từ bảng Room
            .sort({ createdAt: -1 })
            .exec();
    }

    async cancelBooking(bookingId: string, userId: string) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, userId });
        if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng!');

        if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException('Chỉ có thể hủy phòng khi đang chờ xử lý hoặc đã xác nhận!');
        }

        // Logic 24h: Không cho hủy nếu còn cách giờ check-in dưới 24h
        const timeDiff = booking.checkInDate.getTime() - new Date().getTime();
        if (timeDiff < 24 * 60 * 60 * 1000) {
            throw new BadRequestException('Không thể hủy phòng trong vòng 24h trước khi check-in!');
        }

        booking.status = BookingStatus.CANCELLED;
        return booking.save();
    }
}