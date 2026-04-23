export const PAGE = 1;
export const PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const SKIP_AUTHORIZATION_KEY = 'skip_authorization';

export enum API_ACTION {
    READ = 'READ',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    CANCEL = 'CANCEL',
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
    SINGLE = 'SINGLE',
    DOUBLE = 'DOUBLE',
    SUITE = 'SUITE',
    DELUXE = 'DELUXE',
}

export enum RoomStatus {
    AVAILABLE = 'AVAILABLE',
    BOOKED = 'BOOKED',
    OCCUPIED = 'OCCUPIED',
    MAINTENANCE = 'MAINTENANCE',
}


export enum BookingStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CHECKED_IN = 'CHECKED_IN',
    CHECKED_OUT = 'CHECKED_OUT',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
    UNPAID = 'UNPAID',
    PARTIAL = 'PARTIAL',
    PAID = 'PAID',
    REFUNDED = 'REFUNDED',
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