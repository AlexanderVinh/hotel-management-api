import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
    constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) { }

    async get<T = any>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
    }

    async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const data = JSON.stringify(value);
        if (ttlSeconds) {
            await this.redis.set(key, data, 'EX', ttlSeconds);
        } else {
            await this.redis.set(key, data);
        }
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async has(key: string): Promise<boolean> {
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
}
