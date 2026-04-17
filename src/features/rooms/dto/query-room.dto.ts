import { IsOptional, IsString } from 'class-validator';
import { Pagination } from '../../../shared/dto/pagination.dto';

export class QueryRoomDto extends Pagination {
    @IsOptional()
    @IsString()
    roomNumber?: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    status?: string;
}