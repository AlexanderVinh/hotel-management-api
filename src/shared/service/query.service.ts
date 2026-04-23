// src/shared/service/query.service.ts
import { Global, Injectable } from '@nestjs/common';
import * as moment from 'moment';

@Global()
@Injectable()
export class QueryService {
    async buildQuery(request: any) {
        const query: any = {};
        const regexFields = ['fullName', 'email', 'phoneNumber', 'roomNumber'];

        for (const key in request) {
            if (!Object.hasOwnProperty.call(request, key) || key == 'page' || key == 'size') {
                continue;
            }
            const value = request[key];
            if (!value && value !== 0 && value !== false) continue;

            if (regexFields.includes(key)) {
                query[key] = { $regex: value, $options: 'i' };
            }
            else if (key !== 'createdAtFrom' && key !== 'createdAtTo') {
                query[key] = value;
            }
        }

        if (request.createdAtFrom || request.createdAtTo) {
            query['createdAt'] = {};
            if (request.createdAtFrom) {
                query['createdAt']['$gte'] = new Date(request.createdAtFrom);
            }
            if (request.createdAtTo) {
                query['createdAt']['$lte'] = new Date(request.createdAtTo);
            }
        }
        // query['isDeleted'] = { $ne: true }; 

        return query;
    }
}