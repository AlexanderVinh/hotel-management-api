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
export const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || false;

export const VNP_TMN_CODE = process.env.VNP_TMN_CODE || '';
export const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET || '';
export const VNP_URL = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
export const VNP_API = process.env.VNP_API || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
export const VNP_RETURN_URL = process.env.VNP_RETURN_URL || 'http://localhost:3000/api/v1/payments/vnpay-return';