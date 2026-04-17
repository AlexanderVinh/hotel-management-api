import { IsArray, IsMongoId } from 'class-validator';

export class BulkMarkAvailableDto {
    @IsArray({ message: 'roomIds phải là một mảng' })
    @IsMongoId({ each: true, message: 'ID phòng không hợp lệ' })
    roomIds: string[];
}