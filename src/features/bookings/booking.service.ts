import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { BookingDocument, BookingStatus, PaymentStatus } from '../../schemas/booking.schema';
import { RoomDocument } from '../../schemas/room.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RoomsService } from '../rooms/rooms.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { TokenInfo } from 'src/shared/decorator/custom.decorator';

@Injectable()
export class BookingsService {
    constructor(
        @InjectModel('Booking') private bookingModel: Model<BookingDocument>,
        private readonly roomsService: RoomsService,
        @InjectConnection() private connection: Connection, // Dùng để mở Transaction
    ) { }

    async createBooking(user: TokenInfo, payload: CreateBookingDto) {
        const userId = user.userId;
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
                userId: userId,
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

    async getMyBookings(user: TokenInfo) {
        return this.bookingModel.find({ userId: user.userId })
            .populate('rooms.roomId', 'roomNumber type') // Lấy thêm số phòng từ bảng Room
            .sort({ createdAt: -1 })
            .exec();
    }

    async cancelBooking(bookingId: string, user: TokenInfo) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, userId: user.userId });
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

    async getAllBookings(request: QueryBookingDto) {
        const page = request.page || 1;
        const size = request.size || 10;
        const skip = (page - 1) * size;

        // KỸ THUẬT 1: Xây dựng Query Builder linh hoạt
        const query: any = { isDeleted: false }; // Mặc định không lấy đơn đã xóa mềm

        if (request.status) {
            query.status = request.status;
        }

        if (request.bookingCode) {
            // Tìm kiếm tương đối (LIKE) và không phân biệt hoa/thường
            query.bookingCode = new RegExp(request.bookingCode.trim(), 'i');
        }

        // KỸ THUẬT 2: Tối ưu hiệu năng bằng Promise.all (Chạy song song 2 lệnh)
        const [total, items] = await Promise.all([
            this.bookingModel.countDocuments(query).exec(),
            this.bookingModel
                .find(query)
                .skip(skip)
                .limit(size)
                .populate('userId', 'fullName email phone') // Nối sang bảng User lấy thông tin
                .populate('rooms.roomId', 'roomNumber type') // Nối sang bảng Room
                .sort({ createdAt: -1 }) // Đơn mới nhất xếp trên cùng
                .lean() // Giúp object trả về nhẹ hơn, không dính các method ngầm của Mongoose
                .exec()
        ]);

        // KỸ THUẬT 3: Cấu trúc trả về chuẩn Phân trang
        return {
            items,
            meta: {
                totalElements: total,
                currentPage: page,
                pageSize: size,
                totalPages: Math.ceil(total / size),
            }
        };
    }

    // 2. Hàm dùng chung để cập nhật các trạng thái cơ bản (Confirm)
    async updateBookingStatus(id: string, payload: UpdateBookingStatusDto, admin: TokenInfo) {
        // Bước 1: Find & Check Exist
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking || booking.isDeleted) {
            throw new BadRequestException("Đơn đặt phòng không tồn tại hoặc đã bị xóa.");
        }
        if (payload.status === BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException(`Không thể duyệt đơn đang ở trạng thái ${booking.status}. Chỉ duyệt đơn PENDING.`);
        }

        // Bước 3 & 4: Execute Update
        const updatedBooking = await this.bookingModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: payload.status,
                    ...(payload.paymentStatus && { paymentStatus: payload.paymentStatus }), // Cập nhật nếu có truyền
                    ...(payload.note && { note: payload.note }),
                    updatedBy: admin.userId,
                }
            },
            { new: true }
        ).exec();

        return updatedBooking;
    }

    async handleCheckIn(id: string, admin: TokenInfo) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking || booking.isDeleted) throw new BadRequestException("Đơn đặt phòng không tồn tại.");

        if (booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException("Chỉ có thể Check-in cho đơn đã được xác nhận (CONFIRMED)!");
        }

        const updatedBooking = await this.bookingModel.findByIdAndUpdate(
            id,
            { $set: { status: BookingStatus.CHECKED_IN, updatedBy: admin.userId } },
            { new: true }
        ).exec();


        if (!updatedBooking) {
            throw new BadRequestException("Có lỗi xảy ra trong quá trình cập nhật trạng thái!");
        }
        const roomIds = updatedBooking.rooms.map(r => r.roomId.toString());
        await this.roomsService.updateMultipleRoomStatus(roomIds, 'OCCUPIED');

        return updatedBooking;
    }

    async handleCheckOut(id: string, admin: TokenInfo) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking || booking.isDeleted) throw new BadRequestException("Đơn đặt phòng không tồn tại.");

        if (booking.status !== BookingStatus.CHECKED_IN) {
            throw new BadRequestException("Khách chưa nhận phòng (Check-in), không thể Check-out!");
        }

        const updatedBooking = await this.bookingModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: BookingStatus.CHECKED_OUT,
                    paymentStatus: PaymentStatus.PAID,
                    updatedBy: admin.userId
                }
            },
            { new: true }
        ).exec();

        if (!updatedBooking) {
            throw new BadRequestException("Có lỗi xảy ra trong quá trình cập nhật trạng thái!");
        }

        // SIDE EFFECTS: Gọi RoomsService để dọn phòng (Đổi status phòng thành MAINTENANCE)
        const roomIds = updatedBooking.rooms.map(r => r.roomId.toString());
        await this.roomsService.updateMultipleRoomStatus(roomIds, 'MAINTENANCE');

        return updatedBooking;
    }
}