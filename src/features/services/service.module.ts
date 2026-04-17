import { Module } from '@nestjs/common';
import { ServicesController } from './service.controller';
import { ServicesService } from './service.service';

@Module({
    imports: [
    ],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService] // 👈 Mở cửa sẵn: Lát nữa BookingModule sẽ cần gọi sang đây để lấy giá tiền!
})
export class ServicesModule { }