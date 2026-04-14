// src/features/rooms/dto/create-room.dto.ts
import { IsString, IsNumber, IsEnum, IsArray, IsOptional, Min } from 'class-validator';
import { RoomType, RoomStatus } from 'src/schemas/room.schema';

export class CreateRoomDto {
    @IsString()
    roomNumber: string;

    @IsEnum(RoomType)
    type: RoomType;

    @IsNumber()
    @Min(0)
    pricePerNight: number;

    @IsNumber()
    @Min(1)
    capacity: number;

    @IsOptional()
    @IsEnum(RoomStatus)
    status?: RoomStatus;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    amenities?: string[];

    @IsString()
    @IsOptional()
    description?: string;
}