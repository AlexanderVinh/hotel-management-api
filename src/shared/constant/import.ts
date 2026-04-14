// src/shared/constants/import.ts

export const IMPORT_ROOM_COLUMNS = [
    { column: 1, key: 'roomNumber', value: 'Số phòng', type: 'string' },
    { column: 2, key: 'type', value: 'Loại phòng', type: 'string' }, // SINGLE, DOUBLE, SUITE...
    { column: 3, key: 'pricePerNight', value: 'Giá mỗi đêm', type: 'number' },
    { column: 4, key: 'capacity', value: 'Sức chứa', type: 'number' },
    { column: 5, key: 'status', value: 'Trạng thái', type: 'string' }, // AVAILABLE, MAINTENANCE...
    { column: 6, key: 'description', value: 'Mô tả', type: 'string' },
];