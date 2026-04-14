// src/features/rooms/rooms.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { IMPORT_ROOM_COLUMNS } from 'src/shared/constant/import';
import * as ExcelJS from 'exceljs';

@Injectable()
export class RoomsService {
  constructor(@InjectModel('Room') private roomModel: Model<any>) { }

  async create(createRoomDto: CreateRoomDto) {
    const roomExists = await this.roomModel.findOne({ roomNumber: createRoomDto.roomNumber });
    if (roomExists) throw new BadRequestException('Số phòng này đã tồn tại!');
    return await this.roomModel.create(createRoomDto);
  }

  async findOne(id: string) {
    const room = await this.roomModel.findById(id).exec();
    if (!room) throw new NotFoundException('Không tìm thấy phòng!');
    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    const updatedRoom = await this.roomModel.findByIdAndUpdate(id, updateRoomDto, { new: true }).exec();
    if (!updatedRoom) throw new NotFoundException('Không tìm thấy phòng để cập nhật!');
    return updatedRoom;
  }

  async remove(id: string) {
    // Thay vì findByIdAndDelete, ta update cờ isDeleted = true
    const deletedRoom = await this.roomModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    ).exec();
    if (!deletedRoom) throw new NotFoundException('Không tìm thấy phòng để xóa!');
    return deletedRoom;
  }

  // 👇 ================= BULK OPERATIONS (THAO TÁC HÀNG LOẠT) ================= //

  async createMany(createRoomDtos: CreateRoomDto[]) {
    // 1. Trích xuất danh sách số phòng gửi lên
    const roomNumbers = createRoomDtos.map(dto => dto.roomNumber);

    // 2. Kiểm tra xem có phòng nào bị trùng trong Database không
    const existingRooms = await this.roomModel.find({ roomNumber: { $in: roomNumbers } });
    if (existingRooms.length > 0) {
      const duplicateNumbers = existingRooms.map(r => r.roomNumber).join(', ');
      throw new BadRequestException(`Các số phòng sau đã tồn tại: ${duplicateNumbers}`);
    }

    // 3. Dùng insertMany để tối ưu hiệu năng ghi vào DB
    const newRooms = await this.roomModel.insertMany(createRoomDtos);
    return newRooms;
  }

  async updateMany(ids: string[], updateData: UpdateRoomDto) {
    // Ví dụ: Set trạng thái "MAINTENANCE" cho 10 phòng cùng lúc
    const result = await this.roomModel.updateMany(
      { _id: { $in: ids } }, // Tìm các phòng có ID nằm trong mảng
      { $set: updateData }
    );
    return result;
  }

  async removeMany(ids: string[]) {
    // Xóa hàng loạt phòng theo danh sách ID
    const result = await this.roomModel.deleteMany({ _id: { $in: ids } });
    return result;
  }

  // ================= ĐỌC DANH SÁCH (CÓ PHÂN TRANG) ================= //
  async findAll(page: number = 1, size: number = 10) {
    const query = { isDeleted: false }; // 👈 Lọc các phòng chưa bị xóa
    const totalElements = await this.roomModel.countDocuments(query);
    const rooms = await this.roomModel.find(query).skip((page - 1) * size).limit(size).sort({ createdAt: -1 }).exec();
    return { rooms, totalElements };
  }

  async findByIds(ids: string[], session?: ClientSession) {
    const query = this.roomModel.find({
      _id: { $in: ids },
      isDeleted: false
    });

    if (session) {
      query.session(session);
    }

    return await query.lean().exec();
  }

  async importExcel(fileBuffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new BadRequestException('File Excel không hợp lệ hoặc trống!');

    const roomsToCreate: any[] = [];
    const errors: any[] = []; // Cái giỏ hứng lỗi
    const roomNumbersInFile = new Set<string>(); // Bộ nhớ tạm để nhớ các phòng đã đọc trong file

    // 1. Kiểm tra Tiêu đề (Header) - Phần này vẫn phải nghiêm ngặt
    const headerRow = worksheet.getRow(1).values as any[];
    for (const col of IMPORT_ROOM_COLUMNS) {
      const headerValue = headerRow[col.column] ? headerRow[col.column].toString().trim() : '';
      if (!headerValue.toUpperCase().includes(col.value.toUpperCase())) {
        throw new BadRequestException(`File sai định dạng: Cột ${col.column} phải chứa chữ "${col.value}"`);
      }
    }

    // 2. Quét qua từng dòng dữ liệu (Chế độ Bao dung)
    const totalRows = worksheet.rowCount;
    for (let i = 2; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      const roomNumber = row.getCell(1).value?.toString().trim();

      if (!roomNumber) continue;

      // Chốt chặn A: Kiểm tra trùng lặp NGAY TRONG file Excel
      if (roomNumbersInFile.has(roomNumber)) {
        errors.push({ dong: i, phong: roomNumber, loi: 'Số phòng bị trùng lặp bên trong file Excel' });
        continue;
      }
      roomNumbersInFile.add(roomNumber);

      const isExist = await this.roomModel.findOne({ roomNumber });

      if (isExist) {
        // Trả lời cho Frontend biết chính xác phòng này đang ở trạng thái nào
        if (isExist.isDeleted) {
          errors.push({ dong: i, phong: roomNumber, loi: 'Phòng này đã từng tồn tại và đang nằm trong thùng rác (đã xóa mềm)' });
        } else {
          errors.push({ dong: i, phong: roomNumber, loi: 'Số phòng đã tồn tại trong hệ thống' });
        }
        continue; // Bỏ qua dòng này, đi tiếp dòng sau
      }

      // Nếu qua được các chốt chặn -> Ánh xạ dữ liệu
      const roomItem: any = {};
      for (const col of IMPORT_ROOM_COLUMNS) {
        const cellValue = row.getCell(col.column).value;
        if (cellValue !== null && cellValue !== undefined) {
          if (col.type === 'number') {
            roomItem[col.key] = Number(cellValue) || 0;
          } else {
            roomItem[col.key] = cellValue.toString().trim();
          }
        }
      }

      roomsToCreate.push(roomItem);
    }

    // 3. Tiến hành lưu vào Database những phòng hợp lệ
    let savedCount = 0;
    if (roomsToCreate.length > 0) {
      // Dùng lệnh gốc của Mongoose, bỏ qua validation thừa thãi của createMany
      const savedData = await this.roomModel.insertMany(roomsToCreate);
      savedCount = savedData.length;
    }

    // 4. Trả về Báo cáo chi tiết cho Frontend
    return {
      thanhCong: savedCount,
      thatBai: errors.length,
      chiTietLoi: errors, // Trả luôn mảng lỗi để FE bóc ra hiển thị
    };
  }
}