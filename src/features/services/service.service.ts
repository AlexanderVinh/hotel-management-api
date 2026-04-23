import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../../schemas/service.schema';
import * as ExcelJS from 'exceljs'; // Bạn nhớ npm install exceljs nhé
import { IMPORT_SERVICE_COLUMNS } from 'src/shared/constant/import';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { PaginatedResponse } from 'src/shared/dto/response.dto';

@Injectable()
export class ServicesService {
    constructor(@InjectModel(Service.name) private serviceModel: Model<ServiceDocument>) { }

    async create(createServiceDto: CreateServiceDto) {
        const isExist = await this.serviceModel.findOne({
            name: { $regex: new RegExp(`^${createServiceDto.name.trim()}$`, 'i') }
        });

        if (isExist) {
            throw new BadRequestException('Tên dịch vụ này đã tồn tại!');
        }

        return await this.serviceModel.create(createServiceDto);
    }

    async findAll(query: QueryServiceDto) {
        const { page, size } = query;
        const skip = (page - 1) * size;

        const filter: any = {};

        if (query.isActive !== undefined) {
            filter.isActive = query.isActive;
        } else {
            filter.isActive = true;
        }

        if (query.name) {
            filter.name = new RegExp(query.name.trim(), 'i');
        }

        const [total, items] = await Promise.all([
            this.serviceModel.countDocuments(filter).exec(),
            this.serviceModel
                .find(filter)
                .skip(skip)
                .limit(size)
                .sort({ createdAt: -1 })
                .lean()
                .exec()
        ]);

        return PaginatedResponse.create(items, total, page, size);
    }

    async findOne(id: string) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException('Không tìm thấy dịch vụ này!');
        return service;
    }

    async update(id: string, updateServiceDto: UpdateServiceDto) {
        if (updateServiceDto.name) {
            const isExist = await this.serviceModel.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${updateServiceDto.name.trim()}$`, 'i') }
            });
            if (isExist) throw new BadRequestException('Tên dịch vụ này đã bị trùng lặp!');
        }

        const updatedService = await this.serviceModel.findByIdAndUpdate(
            id,
            updateServiceDto,
            { new: true }
        ).exec();

        if (!updatedService) throw new NotFoundException('Không tìm thấy dịch vụ để cập nhật!');
        return updatedService;
    }

    async remove(id: string) {
        const deletedService = await this.serviceModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        ).exec();

        if (!deletedService) throw new NotFoundException('Không tìm thấy dịch vụ để vô hiệu hóa!');
        return deletedService;
    }

    async importExcel(fileBuffer: Buffer) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer as any);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new BadRequestException('File Excel không hợp lệ hoặc trống!');

        const rawItems: any[] = [];
        const errors: any[] = [];
        const namesInFile = new Set<string>();

        const headerRow = worksheet.getRow(1).values as any[];
        for (const col of IMPORT_SERVICE_COLUMNS) {
            const headerValue = headerRow[col.column] ? headerRow[col.column].toString().trim() : '';
            if (!headerValue.toUpperCase().includes(col.value.toUpperCase())) {
                throw new BadRequestException(`File sai định dạng: Cột ${col.column} phải chứa chữ "${col.value}"`);
            }
        }

        const totalRows = worksheet.rowCount;
        for (let i = 2; i <= totalRows; i++) {
            const row = worksheet.getRow(i);
            const serviceName = row.getCell(1).value?.toString().trim();

            if (!serviceName) continue;

            const itemMessages: string[] = [];
            const lowerName = serviceName.toLowerCase();

            const serviceItem: any = { _originalIndex: i };
            for (const col of IMPORT_SERVICE_COLUMNS) {
                const cellValue = row.getCell(col.column).value;
                if (cellValue !== null && cellValue !== undefined) {
                    if (col.type === 'number') {
                        serviceItem[col.key] = Number(cellValue) || 0;
                    } else {
                        serviceItem[col.key] = cellValue.toString().trim();
                    }
                }
            }

            if (namesInFile.has(lowerName)) {
                itemMessages.push('Tên dịch vụ bị trùng lặp bên trong file Excel');
            } else {
                namesInFile.add(lowerName);
            }

            if (itemMessages.length > 0) {
                errors.push({ index: i, name: serviceName, messages: itemMessages });
            } else {
                rawItems.push(serviceItem);
            }
        }

        if (rawItems.length === 0) {
            return { services: [], errors, totalSuccess: 0, totalError: errors.length };
        }

        const namesToCheck = rawItems.map(item => item.name);

        const regexNames = namesToCheck.map(n => new RegExp(`^${n}$`, 'i'));

        const existServices = await this.serviceModel.find({
            name: { $in: regexNames }
        }).select('name isActive').lean();

        const existDBMap = new Map();
        existServices.forEach(s => existDBMap.set(s.name.toLowerCase(), s));

        const itemsToSave = rawItems.filter(item => {
            const existSvc = existDBMap.get(item.name.toLowerCase());

            if (existSvc) {
                const msg = existSvc.isActive
                    ? 'Tên dịch vụ đã tồn tại trong hệ thống'
                    : 'Dịch vụ này đã tồn tại nhưng đang bị vô hiệu hóa (isActive = false)';

                errors.push({
                    index: item._originalIndex,
                    name: item.name,
                    messages: [msg]
                });
                return false;
            }
            return true;
        });

        let savedServices: any[] = [];
        if (itemsToSave.length > 0) {
            const payloadToInsert = itemsToSave.map(({ _originalIndex, ...rest }) => rest);
            savedServices = await this.serviceModel.insertMany(payloadToInsert);
        }

        return {
            services: savedServices,
            errors: errors.sort((a, b) => a.index - b.index),
            totalSuccess: savedServices.length,
            totalError: errors.length
        };
    }

    async findByIds(ids: string[]) {
        return await this.serviceModel
            .find({
                _id: { $in: ids },
                isActive: true
            })
            .lean()
            .exec();
    }
}