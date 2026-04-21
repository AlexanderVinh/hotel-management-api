// src/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MONGODB_URI } from './config';
import { User, UserSchema } from './schemas/user.schema';
import { Token, TokenSchema } from './schemas/token.schema';
import { RoomSchema } from './schemas/room.schema';
import { BookingSchema } from './schemas/booking.schema';
import { ServiceSchema } from './schemas/service.schema';
import { PaymentTransactionSchema } from './schemas/payment-transaction.schema';
import { PermissionSchema } from './schemas/permission.schema';

@Global()
@Module({
    imports: [
        MongooseModule.forRoot(MONGODB_URI),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: 'Token', schema: TokenSchema },
            { name: 'Room', schema: RoomSchema },
            { name: 'Booking', schema: BookingSchema },
            { name: 'Service', schema: ServiceSchema },
            { name: 'PaymentTransaction', schema: PaymentTransactionSchema },
            { name: 'Permission', schema: PermissionSchema },
        ]),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule { }