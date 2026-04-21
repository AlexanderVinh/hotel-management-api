import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from 'src/schemas/permission.schema';
import { UserRole, API_ACTION } from 'src/shared/constant/constant';

@Injectable()
export class SeedService implements OnModuleInit {
    constructor(
        @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    ) { }

    async onModuleInit() {
        await this.seedPermissions();
    }

    async seedPermissions() {
        const defaultPermissions = [
            // ==========================================
            // 1. QUYỀN VẬN HÀNH: STAFF
            // ==========================================
            {
                role: UserRole.STAFF,
                resource: 'bookings',
                actions: ['READ', 'UPDATE', 'MANAGE'],
            },
            {
                role: UserRole.STAFF,
                resource: 'rooms',
                actions: ['READ', 'UPDATE', 'CREATE'],
            },
            {
                role: UserRole.STAFF,
                resource: 'dashboard',
                actions: ['READ'],
            },

            // ==========================================
            // 2. QUYỀN CƠ BẢN: GUEST
            // ==========================================
            {
                role: UserRole.GUEST,
                resource: 'bookings',
                actions: ['READ', 'CREATE', 'CANCEL'],
            },
            {
                role: UserRole.GUEST,
                resource: 'rooms',
                actions: ['READ'],
            },
            // Quyền thanh toán mới để bạn test VNPay
            {
                role: UserRole.GUEST,
                resource: 'payments',
                actions: ['CREATE', 'READ'],
            },

            // ==========================================
            // 3. QUYỀN TỐI CAO: ADMIN (Dù có code bypass nhưng vẫn nên có trong DB)
            // ==========================================
            {
                role: UserRole.ADMIN,
                resource: 'all', // Admin có thể để là 'all' hoặc liệt kê hết
                actions: ['MANAGE'],
            }
        ];

        try {
            for (const p of defaultPermissions) {
                await this.permissionModel.findOneAndUpdate(
                    { role: p.role, resource: p.resource },
                    { ...p, active: true },
                    { upsert: true, new: true },
                );
            }
        } catch (error) {
            console.error('❌ [Seed] Lỗi nạp quyền:', error);
        }
    }
}