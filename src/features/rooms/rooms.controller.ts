// src/features/rooms/rooms.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PublicMeta, Roles } from 'src/shared/decorator/custom.decorator';
import { ResponseApi, PaginatedResponse } from '../../shared/dto/response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { join } from 'path';
import type { Response as ExpressResponse } from 'express';
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  // ================= API HÀNG LOẠT (NẰM TRÊN) ================= //

  @Post('bulk')
  @Roles('admin')
  async createMany(@Body() createRoomDtos: CreateRoomDto[]) {
    const data = await this.roomsService.createMany(createRoomDtos);
    return ResponseApi.create(data, `Đã tạo thành công ${data.length} phòng!`);
  }

  @Patch('bulk')
  @Roles('admin')
  async updateMany(
    @Body('ids') ids: string[],
    @Body('updateData') updateData: UpdateRoomDto
  ) {
    const data = await this.roomsService.updateMany(ids, updateData);
    return ResponseApi.create(data, `Đã cập nhật hàng loạt ${data.modifiedCount} phòng!`);
  }

  @Delete('bulk')
  @Roles('admin')
  async removeMany(@Body('ids') ids: string[]) {
    const data = await this.roomsService.removeMany(ids);
    return ResponseApi.create(data, `Đã xóa thành công ${data.deletedCount} phòng!`);
  }

  // ================= API ĐƠN LẺ VÀ LẤY DANH SÁCH (NẰM DƯỚI) ================= //

  @Post()
  @Roles('admin')
  async create(@Body() createRoomDto: CreateRoomDto) {
    const data = await this.roomsService.create(createRoomDto);
    return ResponseApi.create(data, 'Tạo phòng mới thành công!');
  }

  @Get()
  async findAll(@Query('page') page: string = '1', @Query('size') size: string = '10') {
    const pageNum = parseInt(page, 10);
    const sizeNum = parseInt(size, 10);
    const result = await this.roomsService.findAll(pageNum, sizeNum);
    return PaginatedResponse.create(result.rooms, result.totalElements, pageNum, sizeNum);
  }


  @Get('template/download')
  @Roles('admin') // Chỉ Admin mới được tải form mẫu
  downloadTemplate(@Res() res: ExpressResponse) {
    // 1. Chỉ đường cho Backend biết file đang nằm ở đâu
    // process.cwd() là thư mục gốc của dự án (project-mini)
    const filePath = join(process.cwd(), 'template', 'Room_Import_Template.xlsx');

    // 2. Ép trình duyệt phải tải file về chứ không phải mở ra xem
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Room_Import_Template.xlsx');

    // 3. Truyền file xuống cho người dùng
    res.sendFile(filePath, (err) => {
      if (err) {
        // Nếu không tìm thấy file, trả về lỗi 404 chứ không sập server
        res.status(404).send('Không tìm thấy file mẫu!');
      }
    });


  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.roomsService.findOne(id);
    return ResponseApi.create(data, 'Lấy chi tiết phòng thành công!');
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    const data = await this.roomsService.update(id, updateRoomDto);
    return ResponseApi.create(data, 'Cập nhật phòng thành công!');
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    const data = await this.roomsService.remove(id);
    return ResponseApi.create(data, 'Xóa phòng thành công!');
  }

  @Post('import')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng đính kèm file Excel!');
    }

    const report = await this.roomsService.importExcel(file.buffer);

    // Tùy biến câu thông báo dựa trên kết quả
    const message = `Import hoàn tất: ${report.thanhCong} thành công, ${report.thatBai} thất bại.`;

    return ResponseApi.create(report, message);
  }


}