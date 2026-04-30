import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { BookingStatus, PaymentStatus, RoomStatus, UserRole } from 'src/shared/constant/constant';
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
import { CacheService } from 'src/shared/cache/cache.service';

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
        private readonly cacheService: CacheService,
        @InjectQueue('invoice-queue') private invoiceQueue: Queue,
    ) { }

    async createBooking(user: TokenInfo, payload: CreateBookingDto) {
        const { roomIds: requestedRooms, checkInDate, checkOutDate, note } = payload;

        const lockKeys = requestedRooms.sort().map(id => `lock:room:${id}`);
        const acquiredLocks: string[] = [];
        let isRoomsStatusChanged = false;

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const now = new Date();

        if (checkIn < now) throw new BadRequestException('Ngày nhận phòng không thể ở trong quá khứ!');
        if (checkIn >= checkOut) throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng!');

        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        if (nights > 30) throw new BadRequestException('Chỉ được đặt tối đa 30 đêm!');

        const daysInAdvance = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysInAdvance > 180) throw new BadRequestException('Chỉ được đặt trước tối đa 6 tháng!');

        try {
            // 1. Lấy khóa Redis
            for (const key of lockKeys) {
                const locked = await this.cacheService.acquireLock(key, 10);
                if (!locked) {
                    throw new BadRequestException('Hệ thống đang bận xử lý phòng này cho khách khác. Vui lòng thử lại sau vài giây!');
                }
                acquiredLocks.push(key);
            }

            // 2. Query dùng 'rooms.roomId'
            const overlappingBookings = await this.bookingModel.find({
                'rooms.roomId': { $in: requestedRooms },
                status: { $nin: [BookingStatus.CANCELLED, BookingStatus.CHECKED_OUT] },
                checkInDate: { $lt: checkOut },
                checkOutDate: { $gt: checkIn }
            }).lean();

            if (overlappingBookings.length > 0) {
                throw new BadRequestException('Một hoặc nhiều phòng bạn chọn đã có người đặt trong thời gian này!');
            }

            const rooms = await this.roomsService.findByIds(requestedRooms);

            const availableRooms = rooms.filter(room => room.status === RoomStatus.AVAILABLE);

            if (availableRooms.length !== requestedRooms.length) {
                throw new BadRequestException('Có phòng không tồn tại hoặc đã bị ai đó đặt mất. Vui lòng chọn lại!');
            }

            let totalPrice = 0;
            // 3. Lưu vào DB dùng 'roomId'
            const roomSnapshots = availableRooms.map(room => {
                totalPrice += (room.pricePerNight * nights);
                return {
                    roomId: room._id,
                    priceAtBooking: room.pricePerNight
                };
            });

            await this.roomsService.updateMultipleRoomStatus(requestedRooms, RoomStatus.BOOKED);
            isRoomsStatusChanged = true;

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
                status: BookingStatus.PENDING,
                paymentStatus: PaymentStatus.UNPAID,
                note,
            });

            await newBooking.save();

            return newBooking;

        } catch (error) {
            if (isRoomsStatusChanged) {
                await this.roomsService.updateMultipleRoomStatus(requestedRooms, RoomStatus.AVAILABLE);
            }
            throw error;
        } finally {
            for (const key of acquiredLocks) {
                await this.cacheService.releaseLock(key);
            }
        }
    }

    async getMyBookings(user: TokenInfo) {
        return this.bookingModel.find({ userId: user.userId })
            .populate('rooms.roomId', 'roomNumber type')
            .sort({ createdAt: -1 })
            .exec();
    }

    async cancelBooking(bookingId: string, user: TokenInfo) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

        const query: any = { _id: bookingId };
        if (!isAdmin) {
            query.user = user.userId;
        }

        const booking = await this.bookingModel.findOne(query).lean();
        if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng hoặc bạn không có quyền!');

        if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
            throw new BadRequestException('Chỉ có thể hủy phòng khi đang chờ xử lý hoặc đã xác nhận!');
        }

        if (!isAdmin) {
            const timeDiff = booking.checkInDate.getTime() - new Date().getTime();
            if (timeDiff < 24 * 60 * 60 * 1000) {
                throw new BadRequestException('Không thể hủy phòng trong vòng 24h trước khi check-in!');
            }

            if (booking.paymentStatus !== PaymentStatus.UNPAID) {
                throw new BadRequestException('Đơn hàng đã được thanh toán. Vui lòng liên hệ Hotline/Lễ tân để được hỗ trợ hủy!');
            }
        }

        const updateCondition: any = {
            _id: bookingId,
            status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
        };

        if (!isAdmin) {
            updateCondition.user = user.userId;
            updateCondition.paymentStatus = PaymentStatus.UNPAID;
        }

        const newPaymentStatus = (isAdmin && booking.paymentStatus !== PaymentStatus.UNPAID)
            ? PaymentStatus.REFUNDED
            : booking.paymentStatus;

        const cancelledBooking = await this.bookingModel.findOneAndUpdate(
            updateCondition,
            {
                $set: {
                    status: BookingStatus.CANCELLED,
                    paymentStatus: newPaymentStatus,
                    updatedBy: user.userId,
                    cancelDate: new Date()
                }
            },
            { new: true }
        ).exec();

        if (!cancelledBooking) {
            throw new BadRequestException('Hủy đơn thất bại. Đơn hàng có thể đã thay đổi trạng thái!');
        }

        const roomIds = cancelledBooking.rooms.map(r => r.roomId.toString());
        await this.roomsService.updateMultipleRoomStatus(roomIds, RoomStatus.AVAILABLE);

        return cancelledBooking;
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

        return PaginatedResponse.create(items, total, page, size);
    }

    async updateBookingStatus(id: string, payload: UpdateBookingStatusDto, admin: TokenInfo) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking || booking.isDeleted) {
            throw new BadRequestException("Đơn đặt phòng không tồn tại hoặc đã bị xóa.");
        }
        if (payload.status === BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException(`Không thể duyệt đơn đang ở trạng thái ${booking.status}. Chỉ duyệt đơn PENDING.`);
        }

        const updatedBooking = await this.bookingModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: payload.status,
                    ...(payload.paymentStatus && { paymentStatus: payload.paymentStatus }),
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
        const updatedBooking = await this.bookingModel.findOneAndUpdate(
            {
                _id: id,
                isDeleted: false,
                status: BookingStatus.COMPLETED
            },
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
            const exists = await this.bookingModel.exists({ _id: id, isDeleted: false });
            if (!exists) {
                throw new NotFoundException("Đơn đặt phòng không tồn tại.");
            }
            throw new BadRequestException("Đơn hàng chưa hoàn tất thanh toán hoặc đã được Check-out trước đó!");
        }

        const roomIds = updatedBooking.rooms.map(r => r.roomId.toString());
        await this.roomsService.updateMultipleRoomStatus(roomIds, RoomStatus.MAINTENANCE);

        await this.invoiceQueue.add(
            'send-invoice-job',
            { bookingId: updatedBooking._id.toString() },
            {
                jobId: `invoice_${updatedBooking._id.toString()}`,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: {
                    age: 3600,
                    count: 100,
                },
                removeOnFail: {
                    age: 24 * 3600,
                }
            }
        );

        return updatedBooking;
    }

    async countBookingsByStatus(status: string): Promise<number> {
        return this.bookingModel.countDocuments({ status });
    }

    async countCheckInsBetween(startDate: Date, endDate: Date): Promise<number> {
        return this.bookingModel.countDocuments({
            checkInDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['CONFIRMED', 'CHECKED_IN'] }
        });
    }

    async getRevenueStats(days: number) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await this.bookingModel.aggregate([
            {
                $match: {
                    status: 'CHECKED_OUT',
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
        const booking = await this.bookingModel.findById(bookingId);
        if (!booking) throw new NotFoundException('Đơn đặt phòng không tồn tại');

        if (booking.status !== BookingStatus.CHECKED_IN) {
            throw new BadRequestException('Chỉ có thể thêm dịch vụ khi khách đang ở (CHECKED_IN)');
        }

        const serviceIds = payload.items.map(item => item.service);

        const services = await this.servicesService.findByIds(serviceIds);

        if (services.length !== new Set(serviceIds).size) {
            throw new BadRequestException('Một hoặc nhiều dịch vụ bạn chọn không tồn tại hoặc đã bị ngừng cung cấp');
        }

        const serviceMap = new Map(services.map(s => [s._id.toString(), s]));

        payload.items.forEach(item => {
            const sInfo = serviceMap.get(item.service);

            if (!sInfo) return;

            booking.usedServices.push({
                serviceId: sInfo._id as any,
                name: sInfo.name,
                price: sInfo.price,
                quantity: item.quantity,
                addedAt: new Date()
            });

            booking.totalPrice += (sInfo.price * item.quantity);
        });
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