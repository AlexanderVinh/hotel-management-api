// src/features/bookings/dto/add-extra-services.dto.ts
import { IsArray, ValidateNested, IsMongoId, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class ServiceItemDto {
    @IsMongoId()
    service: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class AddExtraServicesDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ServiceItemDto)
    items: ServiceItemDto[];
}