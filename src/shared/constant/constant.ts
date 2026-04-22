// src/shared/constant/constant.ts
export const PAGE = 1;         // Trang mặc định là 1
export const PAGE_SIZE = 10;   // Mặc định lấy 10 bản ghi/trang
export const MAX_PAGE_SIZE = 100; // Chống user truyền size=1000000 làm sập DB
export const SKIP_AUTHORIZATION_KEY = 'skip_authorization';

export enum API_ACTION {
    READ = 'READ',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    CANCEL = 'CANCEL', // 👈 Thêm cho Khách
    MANAGE = 'MANAGE',
}

export enum UserRole {
    ADMIN = 'admin',
    STAFF = 'staff',
    GUEST = 'guest',
}

export enum TokenType {
    ACCESS_TOKEN = 'access_token',
    REFRESH_TOKEN = 'refresh_token',
}

export enum RoomType {
    SINGLE = 'SINGLE', // Phòng đơn
    DOUBLE = 'DOUBLE', // Phòng đôi
    SUITE = 'SUITE',   // Phòng cao cấp
    DELUXE = 'DELUXE', // Phòng siêu sang
}

export enum RoomStatus {
    AVAILABLE = 'AVAILABLE',     // Sẵn sàng đón khách
    BOOKED = 'BOOKED',           // Đã có người đặt (Giữ chỗ), khách chưa đến
    OCCUPIED = 'OCCUPIED',       // Khách đã check-in và đang ở
    MAINTENANCE = 'MAINTENANCE', // Đang dọn dẹp / sửa chữa
}


// 1. Định nghĩa các trạng thái của đơn đặt phòng
export enum BookingStatus {
    PENDING = 'PENDING',       // Chờ xử lý/Chờ đặt cọc
    CONFIRMED = 'CONFIRMED',   // Đã xác nhận/Đã đặt cọc
    CHECKED_IN = 'CHECKED_IN', // Khách đã nhận phòng
    CHECKED_OUT = 'CHECKED_OUT', // Khách đã trả phòng (Hoàn tất)
    CANCELLED = 'CANCELLED',   // Đã hủy
    COMPLETED = 'COMPLETED',   // Đơn hoàn tất (Đã thanh toán đủ và CHECKED_OUT)
}

// 2. Định nghĩa trạng thái thanh toán
export enum PaymentStatus {
    UNPAID = 'UNPAID',     // Chưa thanh toán
    PARTIAL = 'PARTIAL',   // Thanh toán một phần (Đặt cọc)
    PAID = 'PAID',         // Đã thanh toán đủ
    REFUNDED = 'REFUNDED', // Đã hoàn tiền (Trường hợp hủy phòng)
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum PaymentType {
    FULL = 'FULL',
    DEPOSIT = 'DEPOSIT',
}