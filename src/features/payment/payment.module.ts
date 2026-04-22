import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { VnpayService } from './vnpay.service';
import { BookingsModule } from '../bookings/booking.module';
<<<<<<< HEAD
import { SharedQueueModule } from 'src/shared/queue/queue.module';
=======
>>>>>>> ef490d10971833bf970dce0fbdd13041bf4b3a45

@Module({
    imports: [
        BookingsModule,
<<<<<<< HEAD
        SharedQueueModule,
=======
>>>>>>> ef490d10971833bf970dce0fbdd13041bf4b3a45
    ],
    controllers: [PaymentController],
    providers: [VnpayService],
    exports: [VnpayService],
})
export class PaymentModule { }