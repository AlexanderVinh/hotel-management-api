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
            {
                role: UserRole.GUEST,
                resource: 'payments',
                actions: ['CREATE', 'READ'],
            },

            {
                role: UserRole.ADMIN,
                resource: 'all',
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
            console.error('[Seed] Lỗi nạp quyền:', error);
        }
    }
}