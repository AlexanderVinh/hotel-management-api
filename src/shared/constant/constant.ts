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
    CANCEL = 'CANCEL',
    MANAGE = 'MANAGE',
}

export enum UserRole {
    ADMIN = 'admin',
    STAFF = 'staff',
    GUEST = 'guest',
}
