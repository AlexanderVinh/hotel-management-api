import { forwardRef, Module } from '@nestjs/common';
import { BookingsController } from './booking.controller';
import { BookingsService } from './booking.service';
import { RoomsService } from '../rooms/rooms.service';
import { ServicesModule } from '../services/service.module';
import { RoomsModule } from '../rooms/rooms.module';
import { MailModule } from 'src/shared/mail/mail.module';
import { InvoiceModule } from 'src/shared/invoice/invoice.module';
import { BullModule } from '@nestjs/bull';
import { InvoiceProcessor } from './invoice.processor';
import { CacheService } from 'src/shared/cache/cache.service';

@Module({
    imports: [
        ServicesModule,
        RoomsModule,
        MailModule,
        InvoiceModule,
    ],
    controllers: [BookingsController],
    providers: [BookingsService, InvoiceProcessor, CacheService],
    exports: [BookingsService],
})
export class BookingsModule { }