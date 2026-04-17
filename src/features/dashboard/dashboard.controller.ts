import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ResponseApi } from '../../shared/dto/response.dto';
import { ActionMeta, ResourceMeta } from '../../shared/decorator/custom.decorator';
import { API_ACTION } from '../../shared/constant/constant';

@Controller('dashboard')
@ResourceMeta('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('overview')
    @ActionMeta(API_ACTION.READ)
    async getOverview() {
        const data = await this.dashboardService.getOverviewMetrics();
        return ResponseApi.create(data, 'Lấy dữ liệu tổng quan thành công!');
    }

    @Get('revenue')
    @ActionMeta(API_ACTION.READ)
    async getRevenue() {
        const data = await this.dashboardService.getRevenueStats();
        return ResponseApi.create(data, 'Thống kê doanh thu 30 ngày qua thành công!');
    }
}