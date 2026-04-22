import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { VnpayService } from './vnpay.service';
import { BookingsModule } from '../bookings/booking.module';
<<<<<<< HEAD
<<<<<<< HEAD
import { SharedQueueModule } from 'src/shared/queue/queue.module';
=======
>>>>>>> ef490d10971833bf970dce0fbdd13041bf4b3a45
=======
import { SharedQueueModule } from 'src/shared/queue/queue.module';
>>>>>>> 5cf456decc60fee0ed4524d6529c4f3950a9dc1f

@Module({
    imports: [
        BookingsModule,
<<<<<<< HEAD
<<<<<<< HEAD
        SharedQueueModule,
=======
>>>>>>> ef490d10971833bf970dce0fbdd13041bf4b3a45
=======
        SharedQueueModule,
>>>>>>> 5cf456decc60fee0ed4524d6529c4f3950a9dc1f
    ],
    controllers: [PaymentController],
    providers: [VnpayService],
    exports: [VnpayService],
})
export class PaymentModule { }