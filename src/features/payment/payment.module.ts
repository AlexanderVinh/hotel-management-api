import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { VnpayService } from './vnpay.service';
import { BookingsModule } from '../bookings/booking.module';

@Module({
    imports: [
        BookingsModule,
    ],
    controllers: [PaymentController],
    providers: [VnpayService],
    exports: [VnpayService],
})
export class PaymentModule { }