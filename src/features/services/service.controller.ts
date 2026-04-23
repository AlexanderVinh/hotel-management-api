import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './service.service';
import { ActionMeta, ResourceMeta } from 'src/shared/decorator/custom.decorator';
import { API_ACTION } from 'src/shared/constant/constant';
import { ResponseApi } from 'src/shared/dto/response.dto';
import 'multer';
import { join } from 'path';
import type { Response as ExpressResponse } from 'express';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';


@Controller('services')
@ResourceMeta('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Post()
    @ActionMeta(API_ACTION.CREATE)
    async create(@Body() createServiceDto: CreateServiceDto) {
        const data = await this.servicesService.create(createServiceDto);
        return ResponseApi.create(data, 'Tạo dịch vụ mới thành công!');
    }

    @Get()
    @ActionMeta(API_ACTION.READ)
    async findAll(@Query() query: any) {
        const data = await this.servicesService.findAll(query);
        return ResponseApi.create(data, 'Lấy danh sách dịch vụ thành công!');
    }

    @Get(':id')
    @ActionMeta(API_ACTION.READ)
    async findOne(@Param('id') id: string) {
        const data = await this.servicesService.findOne(id);
        return ResponseApi.create(data, 'Lấy chi tiết dịch vụ thành công!');
    }

    @Patch(':id')
    @ActionMeta(API_ACTION.UPDATE)
    async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
        const data = await this.servicesService.update(id, updateServiceDto);
        return ResponseApi.create(data, 'Cập nhật thông tin dịch vụ thành công!');
    }

    @Delete(':id')
    @ActionMeta(API_ACTION.DELETE)
    async remove(@Param('id') id: string) {
        const data = await this.servicesService.remove(id);
        return ResponseApi.create(data, 'Đã vô hiệu hóa dịch vụ này!');
    }

    @Post('import')
    @ActionMeta(API_ACTION.MANAGE)
    @UseInterceptors(FileInterceptor('file'))
    async importExcel(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Vui lòng đính kèm file Excel!');

        const data = await this.servicesService.importExcel(file.buffer);
        return ResponseApi.create(
            data,
        );
    }

    @Get('template/download')
    @ActionMeta(API_ACTION.READ)
    downloadTemplate(@Res() res: ExpressResponse) {
        const filePath = join(process.cwd(), 'template', 'Service_Import_Template.xlsx');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Service_Import_Template.xlsx');

        res.sendFile(filePath, (err) => {
            if (err) res.status(404).send('Không tìm thấy file mẫu!');
        });
    }
}