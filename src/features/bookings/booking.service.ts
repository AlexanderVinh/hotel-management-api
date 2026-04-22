import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { BookingStatus, PaymentStatus, RoomStatus } from 'src/shared/constant/constant';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RoomsService } from '../rooms/rooms.service';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { TokenInfo } from 'src/shared/decorator/custom.decorator';
import { PaginatedResponse } from 'src/shared/dto/response.dto';
import { ServicesService } from '../services/service.service';
import { AddExtraServicesDto } from './dto/add-extra-service.dto';
import { BookingDocument } from 'src/schemas/booking.schema';
import { InvoiceService } from 'src/shared/invoice/invoice.service';
import { MailService } from 'src/shared/mail/mail.service';
import { type Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class BookingsService {
    constructor(
        @InjectModel('Booking') private bookingModel: Model<BookingDocument>,
        private readonly roomsService: RoomsService,
        @Inject(forwardRef(() => ServicesService))
        private readonly servicesService: ServicesService,
        @InjectConnection() private connection: Connection, // Dùng để mở Transaction
        private readonly invoiceService: InvoiceService,
        private readonly mailService: MailService,
        @InjectQueue('invoice-queue') private invoiceQueue: Queue,
    ) { }

    async createBooking(user: TokenInfo, payload: CreateBookingDto) {
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

            let totalPrice = 0;
            const roomSnapshots = rooms.map(room => {
                totalPrice += (room.pricePerNight * nights);
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
                user: user.userId,
                rooms: roomSnapshots,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                totalPrice,
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


    async getMyBookings(user: TokenInfo) {
        return this.bookingModel.find({ userId: user.userId })
            .populate('rooms.roomId', 'roomNumber type')
            .sort({ createdAt: -1 })
            .exec();
    }

    async cancelBooking(bookingId: string, user: TokenInfo) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, userId: user.userId });
        if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng!');

        if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException('Chỉ có thể hủy phòng khi đang chờ xử lý hoặc đã xác nhận!');
        }

        const timeDiff = booking.checkInDate.getTime() - new Date().getTime();
        if (timeDiff < 24 * 60 * 60 * 1000) {
            throw new BadRequestException('Không thể hủy phòng trong vòng 24h trước khi check-in!');
        }

        booking.status = BookingStatus.CANCELLED;
        return booking.save();
    }

    async getAllBookings(request: QueryBookingDto) {
        const { page, size } = request;
        const skip = (page - 1) * size;

        const query: any = { isDeleted: false };

        if (request.status) {
            query.status = request.status;
        }

        if (request.bookingCode) {
            query.bookingCode = new RegExp(request.bookingCode.trim(), 'i');
        }

        const [total, items] = await Promise.all([
            this.bookingModel.countDocuments(query).exec(),
            this.bookingModel
                .find(query)
                .skip(skip)
                .limit(size)
                .populate('userId', 'fullName email phone')
                .populate('rooms.roomId', 'roomNumber type')
                .sort({ createdAt: -1 })
                .lean()
                .exec()
        ]);

        // KỸ THUẬT 3: Cấu trúc trả về chuẩn Phân trang
        return PaginatedResponse.create(items, total, page, size);
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

        if (booking.status !== BookingStatus.COMPLETED) {
            throw new BadRequestException("Khách chưa thanh toán (Completed), không thể Check-out!");
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
            { returnDocument: 'after' }
        ).exec();

        if (!updatedBooking) {
            throw new BadRequestException("Lỗi cập nhật trạng thái đơn đặt phòng!");
        }

        const roomIds = updatedBooking.rooms.map(r => r.roomId.toString());
        await this.roomsService.updateMultipleRoomStatus(roomIds, RoomStatus.MAINTENANCE);

        await this.invoiceQueue.add(
            'send-invoice-job',
            { bookingId: updatedBooking._id.toString() },
            {
                attempts: 3,
                backoff: 5000
            }
        );

        // 5. Trả kết quả NGAY LẬP TỨC cho khách
        return updatedBooking;
    }

    // Đếm đơn đặt phòng theo trạng thái
    async countBookingsByStatus(status: string): Promise<number> {
        return this.bookingModel.countDocuments({ status });
    }

    // Đếm lượng khách Check-in trong khoảng thời gian
    async countCheckInsBetween(startDate: Date, endDate: Date): Promise<number> {
        return this.bookingModel.countDocuments({
            checkInDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['CONFIRMED', 'CHECKED_IN'] } // Nhớ import enum nếu bạn đang dùng Enum
        });
    }

    // Chuyển khối Aggregation tính doanh thu về đây
    async getRevenueStats(days: number) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await this.bookingModel.aggregate([
            {
                $match: {
                    status: 'CHECKED_OUT', // Chỉ tính tiền đơn đã hoàn tất
                    updatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    dailyRevenue: { $sum: '$totalPrice' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    }

    async addExtraServices(bookingId: string, payload: AddExtraServicesDto) {
        // 1. Tìm đơn đặt phòng (Nhớ dùng tên biến mới là totalPrice)
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException('Đơn đặt phòng không tồn tại');

        if (booking.status !== BookingStatus.CHECKED_IN) {
            throw new BadRequestException('Chỉ có thể thêm dịch vụ khi khách đang ở (CHECKED_IN)');
        }

        // 2. Lấy danh sách ID từ payload (DTO đã bỏ chữ "Id" ở đuôi)
        const serviceIds = payload.items.map(item => item.service);

        // 3. Truy vấn Database 1 lần duy nhất
        const services = await this.servicesService.findByIds(serviceIds);

        // Kiểm tra xem có dịch vụ nào bị "ma" (không tồn tại) không
        if (services.length !== new Set(serviceIds).size) {
            throw new BadRequestException('Một hoặc nhiều dịch vụ bạn chọn không tồn tại hoặc đã bị ngừng cung cấp');
        }

        const serviceMap = new Map(services.map(s => [s._id.toString(), s]));

        // 5. Duyệt mảng và cộng dồn
        payload.items.forEach(item => {
            const sInfo = serviceMap.get(item.service);

            // Chốt chặn lỗi TS18048: Kiểm tra nếu sInfo không tồn tại thì bỏ qua (hoặc throw lỗi)
            if (!sInfo) return;

            // Sửa lỗi TS2561: Mapping đúng tên trường theo thông báo lỗi của Schema
            booking.usedServices.push({
                serviceId: sInfo._id as any, // 👈 Sửa 'service' thành 'serviceId'
                name: sInfo.name,
                price: sInfo.price,          // 👈 Sửa 'priceAtBooking' thành 'price' cho khớp Schema
                quantity: item.quantity,
                addedAt: new Date()
            });

            // Tính toán tổng tiền
            booking.totalPrice += (sInfo.price * item.quantity);
        });
        // 6. Lưu kết quả
        return await booking.save();
    }

    async updatePaymentStatus(bookingId: string, paymentStatus: string) {
        return await this.bookingModel.findByIdAndUpdate(
            bookingId,
            { paymentStatus: paymentStatus },
            { new: true }
        ).exec();
    }

    async findOne(id: string) {
        return await this.bookingModel.findById(id).exec();
    }

    // 2. Thêm hàm cập nhật trạng thái sau khi thanh toán VNPay
    async updatePaymentAfterVnpay(id: string, data: {
        paidAmount: number;
        paymentStatus: string;
        status: string;
    }) {
        return await this.bookingModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    paidAmount: data.paidAmount,
                    paymentStatus: data.paymentStatus,
                    status: data.status,
                },
            },
            { new: true },
        );
    }
}