import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { VnpayService } from './vnpay.service';
import { BookingsModule } from '../bookings/booking.module';
import { SharedQueueModule } from 'src/shared/queue/queue.module';

@Module({
    imports: [
        BookingsModule,
        SharedQueueModule,
    ],
    controllers: [PaymentController],
    providers: [VnpayService],
    exports: [VnpayService],
})
export class PaymentModule { }