import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PublicMeta, ResourceMeta, ActionMeta } from 'src/shared/decorator/custom.decorator';
import { ResponseApi } from '../../shared/dto/response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { join } from 'path';
import type { Response as ExpressResponse } from 'express';
import { QueryRoomDto } from './dto/query-room.dto';
import { API_ACTION } from 'src/shared/constant/constant';

@Controller('rooms')
@ResourceMeta('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  @Post('bulk')
  @ActionMeta(API_ACTION.MANAGE)
  async createMany(@Body() createRoomDtos: CreateRoomDto[]) {
    const data = await this.roomsService.createMany(createRoomDtos);
    return ResponseApi.create(data, `Đã tạo thành công ${data.length} phòng!`);
  }

  @Patch('bulk')
  @ActionMeta(API_ACTION.MANAGE)
  async updateMany(
    @Body('ids') ids: string[],
    @Body('updateData') updateData: UpdateRoomDto
  ) {
    const data = await this.roomsService.updateMany(ids, updateData);
    return ResponseApi.create(data, `Đã cập nhật hàng loạt ${data.modifiedCount} phòng!`);
  }

  @Delete('bulk')
  @ActionMeta(API_ACTION.DELETE)
  async removeMany(@Body('ids') ids: string[]) {
    const data = await this.roomsService.removeMany(ids);
    return ResponseApi.create(data, `Đã xóa thành công ${data.deletedCount} phòng!`);
  }

  @Post('import')
  @ActionMeta(API_ACTION.MANAGE)
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng đính kèm file Excel!');
    const report = await this.roomsService.importExcel(file.buffer);
    const message = `Import hoàn tất: ${report.thanhCong} thành công, ${report.thatBai} thất bại.`;
    return ResponseApi.create(report, message);
  }

  // ================= API ĐƠN LẺ ================= //

  @Post()
  @ActionMeta(API_ACTION.CREATE)
  async create(@Body() createRoomDto: CreateRoomDto) {
    const data = await this.roomsService.create(createRoomDto);
    return ResponseApi.create(data, 'Tạo phòng mới thành công!');
  }

  @Get()
  @PublicMeta()
  @ActionMeta(API_ACTION.READ) // Khách hàng có quyền READ nên sẽ được qua
  async findAll(@Query() request: QueryRoomDto) {
    const data = await this.roomsService.findAll(request);
    return ResponseApi.create(data, 'Lấy danh sách phòng thành công!');
  }

  @Get('template/download')
  @ActionMeta(API_ACTION.MANAGE)
  downloadTemplate(@Res() res: ExpressResponse) {
    const filePath = join(process.cwd(), 'template', 'Room_Import_Template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Room_Import_Template.xlsx');
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).send('Không tìm thấy file mẫu!');
    });
  }

  @Get(':id')
  @PublicMeta()
  @ActionMeta(API_ACTION.READ)
  async findOne(@Param('id') id: string) {
    const data = await this.roomsService.findOne(id);
    return ResponseApi.create(data, 'Lấy chi tiết phòng thành công!');
  }

  @Patch(':id')
  @ActionMeta(API_ACTION.UPDATE)
  async update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    const data = await this.roomsService.update(id, updateRoomDto);
    return ResponseApi.create(data, 'Cập nhật phòng thành công!');
  }

  @Delete(':id')
  @ActionMeta(API_ACTION.DELETE)
  async remove(@Param('id') id: string) {
    const data = await this.roomsService.remove(id);
    return ResponseApi.create(data, 'Xóa phòng thành công!');
  }


}