// src/shared/queue/queue.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Global() // 🎯 Quan trọng: Để bạn không cần import lại ở các module khác
@Module({
    imports: [
        BullModule.registerQueue({
            name: 'invoice-queue',
        }),
        // Bạn có thể thêm các queue khác ở đây (vd: mail-queue, report-queue...)
    ],
    exports: [BullModule], // 🎯 Xuất ra để các module khác sử dụng @InjectQueue
})
export class SharedQueueModule { }