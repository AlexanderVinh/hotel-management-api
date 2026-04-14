// src/config.ts
import * as dotenv from 'dotenv';
dotenv.config();

export const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_management_db';
export const HOTEL_ACCESS_SECRET_KEY = process.env.HOTEL_ACCESS_SECRET_KEY || 'test';
export const HOTEL_REFRESH_SECRET_KEY = process.env.HOTEL_REFRESH_SECRET_KEY || 'test';
export const HOTEL_ACCESS_EXPIRED_IN = process.env.HOTEL_ACCESS_EXPIRED_IN || '1d';
export const HOTEL_REFRESH_EXPIRED_IN = process.env.HOTEL_REFRESH_EXPIRED_IN || '30d';
export const COOKIE_NAME = process.env.COOKIE_NAME || 'dev_hotel_token';
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || 'localhost';
export const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || false; // Nếu bằng true thì chỉ chạy trên web HTTPS