// src/features/rooms/rooms.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { IMPORT_ROOM_COLUMNS } from 'src/shared/constant/import';
import * as ExcelJS from 'exceljs';
import { QueryRoomDto } from './dto/query-room.dto';
import { PaginatedResponse } from 'src/shared/dto/response.dto';
import { TokenInfo } from 'src/shared/decorator/custom.decorator';
import { RoomStatus as ROOM_STATUS } from 'src/shared/constant/constant';
import { CacheService } from 'src/shared/cache/cache.service';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel('Room') private roomModel: Model<any>,
    private readonly cacheService: CacheService
  ) { }

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

  async findAll(request: QueryRoomDto) {
    const cacheKey = `ROOMS_LIST_${JSON.stringify(request)}`;

    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const { page, size } = request;
    const skip = (page - 1) * size;

    const query: any = { isDeleted: false };

    if (request.roomNumber) {
      query.roomNumber = new RegExp(request.roomNumber.trim(), 'i');
    }
    if (request.type) {
      query.type = request.type;
    }
    if (request.status) {
      query.status = request.status;
    }

    const [total, items] = await Promise.all([
      this.roomModel.countDocuments(query).exec(),
      this.roomModel
        .find(query)
        .skip(skip)
        .limit(size)
        .sort({ createdAt: -1 })
        .lean()
        .exec()
    ]);

    const result = PaginatedResponse.create(items, total, page, size);

    await this.cacheService.set(cacheKey, result, 60);

    return result;
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

    const rawItems: any[] = [];
    const errors: any[] = [];
    const roomNumbersInFile = new Set<string>();

    const headerRow = worksheet.getRow(1).values as any[];
    for (const col of IMPORT_ROOM_COLUMNS) {
      const headerValue = headerRow[col.column] ? headerRow[col.column].toString().trim() : '';
      if (!headerValue.toUpperCase().includes(col.value.toUpperCase())) {
        throw new BadRequestException(`File sai định dạng: Cột ${col.column} phải chứa chữ "${col.value}"`);
      }
    }

    const totalRows = worksheet.rowCount;
    for (let i = 2; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      const roomNumber = row.getCell(1).value?.toString().trim();

      if (!roomNumber) continue;

      const itemMessages: string[] = [];
      const upperRoomNumber = roomNumber.toUpperCase();

      // Ánh xạ dữ liệu
      const roomItem: any = { _originalIndex: i };
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

      if (roomNumbersInFile.has(upperRoomNumber)) {
        itemMessages.push('Số phòng bị trùng lặp bên trong file Excel');
      } else {
        roomNumbersInFile.add(upperRoomNumber);
      }

      if (itemMessages.length > 0) {
        errors.push({ index: i, name: roomNumber, messages: itemMessages });
      } else {
        rawItems.push(roomItem);
      }
    }

    if (rawItems.length === 0) {
      return { rooms: [], errors, totalSuccess: 0, totalError: errors.length };
    }

    const roomNumbersToCheck = rawItems.map(item => item.roomNumber);

    const regexRoomNumbers = roomNumbersToCheck.map(n => new RegExp(`^${n}$`, 'i'));

    const existRooms = await this.roomModel.find({
      roomNumber: { $in: regexRoomNumbers }
    }).select('roomNumber isDeleted').lean();

    const existDBMap = new Map();
    existRooms.forEach(r => existDBMap.set(r.roomNumber.toUpperCase(), r));

    const itemsToSave = rawItems.filter(item => {
      const existRoom = existDBMap.get(item.roomNumber.toUpperCase());

      if (existRoom) {
        const msg = existRoom.isDeleted
          ? 'Phòng này đã từng tồn tại và đang nằm trong thùng rác (đã xóa mềm)'
          : 'Số phòng đã tồn tại trong hệ thống';

        errors.push({
          index: item._originalIndex,
          name: item.roomNumber,
          messages: [msg]
        });
        return false;
      }
      return true;
    });

    let savedRooms: any[] = [];
    if (itemsToSave.length > 0) {
      const payloadToInsert = itemsToSave.map(({ _originalIndex, ...rest }) => rest);
      savedRooms = await this.roomModel.insertMany(payloadToInsert);
    }

    return {
      rooms: savedRooms,
      errors: errors.sort((a, b) => a.index - b.index),
      totalSuccess: savedRooms.length,
      totalError: errors.length
    };
  }


  async updateMultipleRoomStatus(roomIds: string[], newStatus: string, session?: ClientSession) {
    if (!roomIds || roomIds.length === 0) return;

    const query = this.roomModel.updateMany(
      { _id: { $in: roomIds } },
      { $set: { status: newStatus } }
    );

    if (session) {
      query.session(session);
    }

    await query.exec();
  }


  async countRoomsByStatus(status: string): Promise<number> {
    return this.roomModel.countDocuments({
      status,
      isDeleted: { $ne: true }
    });
  }

  async markRoomAsAvailable(roomId: string, admin: TokenInfo) {
    const room = await this.roomModel.findById(roomId);
    if (!room) throw new NotFoundException('Không tìm thấy phòng!');

    const validStatuses = [ROOM_STATUS.MAINTENANCE, ROOM_STATUS.OCCUPIED];
    if (!validStatuses.includes(room.status as any)) {
      throw new BadRequestException(`Phòng đang ở trạng thái ${room.status}, không cần dọn dẹp!`);
    }

    room.status = ROOM_STATUS.AVAILABLE;
    room.updatedBy = admin.userId;
    await room.save();

    return {
      roomId: room._id,
      status: room.status,
      message: 'Phòng đã sẵn sàng đón khách mới!'
    };
  }

  async bulkMarkAvailable(roomIds: string[], admin: TokenInfo) {
    const result = await this.roomModel.updateMany(
      {
        _id: { $in: roomIds },
        status: ROOM_STATUS.MAINTENANCE
      },
      {
        $set: {
          status: ROOM_STATUS.AVAILABLE,
          updatedBy: admin.userId
        }
      }
    );

    return {
      requestedCount: roomIds.length,
      modifiedCount: result.modifiedCount,
      message: `Đã giải phóng ${result.modifiedCount}/${roomIds.length} phòng.`
    };
  }
}