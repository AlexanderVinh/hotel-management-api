import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Global()
@Module({
    imports: [
        BullModule.registerQueue({
            name: 'invoice-queue',
        }),
    ],
    exports: [BullModule],
})
export class SharedQueueModule { }