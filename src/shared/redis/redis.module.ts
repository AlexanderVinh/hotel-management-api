import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Global() // Biến nó thành Global để không phải import lắt nhắt nhiều nơi
@Module({
    providers: [
        {
            provide: 'REDIS_CLIENT',
            inject: [ConfigService], // Tiêm ConfigService vào
            useFactory: (configService: ConfigService) => {
                return new Redis({
                    host: configService.get<string>('REDIS_HOST'),
                    port: configService.get<number>('REDIS_PORT'),
                    password: configService.get<string>('REDIS_PASSWORD') || undefined,
                });
            },
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule { }