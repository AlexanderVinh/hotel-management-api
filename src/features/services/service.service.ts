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
        // Kiểm tra trùng tên (Không phân biệt hoa thường)
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

        // Build Query động
        const filter: any = {};

        // Mặc định chỉ lấy các dịch vụ đang hoạt động, trừ khi Admin muốn xem tất cả
        if (query.isActive !== undefined) {
            filter.isActive = query.isActive;
        } else {
            filter.isActive = true;
        }

        if (query.name) {
            filter.name = new RegExp(query.name.trim(), 'i'); // Tìm kiếm tương đối
        }

        // Đếm tổng và lấy dữ liệu song song
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

    // ================= LẤY CHI TIẾT (READ ONE) ================= //
    async findOne(id: string) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException('Không tìm thấy dịch vụ này!');
        return service;
    }

    // ================= CẬP NHẬT (UPDATE) ================= //
    async update(id: string, updateServiceDto: UpdateServiceDto) {
        // Nếu có cập nhật tên, phải check xem tên mới có bị trùng với thằng khác không
        if (updateServiceDto.name) {
            const isExist = await this.serviceModel.findOne({
                _id: { $ne: id }, // Bỏ qua chính nó
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
        // Thay vì xóa hẳn, ta update cờ isActive = false
        // Điều này đảm bảo các hóa đơn cũ (Booking) gọi món này không bị lỗi khi truy xuất
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

        // 1. Kiểm tra Tiêu đề (Header)
        const headerRow = worksheet.getRow(1).values as any[];
        for (const col of IMPORT_SERVICE_COLUMNS) {
            const headerValue = headerRow[col.column] ? headerRow[col.column].toString().trim() : '';
            if (!headerValue.toUpperCase().includes(col.value.toUpperCase())) {
                throw new BadRequestException(`File sai định dạng: Cột ${col.column} phải chứa chữ "${col.value}"`);
            }
        }

        // 2. Parse dữ liệu thô và check trùng lặp nội bộ
        const totalRows = worksheet.rowCount;
        for (let i = 2; i <= totalRows; i++) {
            const row = worksheet.getRow(i);
            const serviceName = row.getCell(1).value?.toString().trim();

            if (!serviceName) continue; // Bỏ qua dòng trống

            const itemMessages: string[] = [];
            const lowerName = serviceName.toLowerCase();

            // Ánh xạ dữ liệu và gắn index gốc để tracking lỗi
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

            // Chốt chặn A: Trùng lặp NGAY TRONG file Excel
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

        // Nếu file trống hoặc tất cả đều lỗi ngay từ vòng 1
        if (rawItems.length === 0) {
            return { services: [], errors, totalSuccess: 0, totalError: errors.length };
        }

        // 3. TỐI ƯU HIỆU NĂNG: Truy vấn Database 1 lần duy nhất bằng $in
        const namesToCheck = rawItems.map(item => item.name);

        // Chuyển mảng tên thành mảng RegExp để tìm chính xác không phân biệt hoa thường
        const regexNames = namesToCheck.map(n => new RegExp(`^${n}$`, 'i'));

        const existServices = await this.serviceModel.find({
            name: { $in: regexNames }
        }).select('name isActive').lean();

        // Ép dữ liệu DB vào một Map để tra cứu siêu tốc O(1)
        const existDBMap = new Map();
        existServices.forEach(s => existDBMap.set(s.name.toLowerCase(), s));

        // 4. Lọc ra những Item hợp lệ cuối cùng để lưu
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

        // 5. Tiến hành lưu vào Database
        let savedServices: any[] = [];
        if (itemsToSave.length > 0) {
            // Xóa biến tạm _originalIndex trước khi insert vào DB
            const payloadToInsert = itemsToSave.map(({ _originalIndex, ...rest }) => rest);
            savedServices = await this.serviceModel.insertMany(payloadToInsert);
        }

        // 6. Trả về cấu trúc Object y hệt học viện
        return {
            services: savedServices,
            errors: errors.sort((a, b) => a.index - b.index), // Sắp xếp lỗi theo thứ tự dòng từ trên xuống
            totalSuccess: savedServices.length,
            totalError: errors.length
        };
    }

    async findByIds(ids: string[]) {
        return await this.serviceModel
            .find({
                _id: { $in: ids },
                isActive: true // Chỉ lấy các dịch vụ còn đang kinh doanh
            })
            .lean()
            .exec();
    }
}