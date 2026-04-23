import { Module } from '@nestjs/common';
import { ServicesController } from './service.controller';
import { ServicesService } from './service.service';

@Module({
    imports: [
    ],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService]
})
export class ServicesModule { }