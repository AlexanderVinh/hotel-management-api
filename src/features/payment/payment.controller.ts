import { Controller, Post, Body, UseGuards, Ip, Get, Redirect, Query } from '@nestjs/common';
import { VnpayService } from './vnpay.service';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { API_ACTION } from 'src/shared/constant/constant';
import { ActionMeta, Auth, PublicMeta, ResourceMeta, type TokenInfo } from 'src/shared/decorator/custom.decorator';
import { ResponseApi } from 'src/shared/dto/response.dto';

@Controller('payments')
@ResourceMeta('payments')
export class PaymentController {
    constructor(private readonly vnpayService: VnpayService) { }

    @UseGuards(JwtAuthGuard)
    @Post('create-vnpay-url')
    @ActionMeta(API_ACTION.CREATE)
    async createPaymentUrl(
        @Auth() user: TokenInfo,
        @Body() payload: CreatePaymentDto,
        @Ip() ip: string
    ) {
        const clientIp = (ip === '::1' || !ip) ? '127.0.0.1' : ip;

        const url = await this.vnpayService.createPaymentUrl(user, payload, clientIp);

        return ResponseApi.create({ url }, 'Tạo link thanh toán VNPay thành công!');
    }

    @PublicMeta()
    @Get('vnpay-ipn')
    async vnpayIpn(@Query() query: any) {
        return await this.vnpayService.vnpayIpn(query);
    }

    @PublicMeta()
    @Get('vnpay-return')
    // @Redirect()
    async vnpayReturn(@Query() query: any) {
        const rspCode = query['vnp_ResponseCode'];
        const orderInfo = query['vnp_OrderInfo'] || '';

        const bookingId = orderInfo.split('Thanh_toan_booking_')[1];

        if (rspCode === '00') {
            // return { url: `http://localhost:5173/payment-success?booking=${bookingId}` };
            return query;
        } else {
            return { url: `http://localhost:5173/payment-failed?booking=${bookingId}` };
        }
    }
}