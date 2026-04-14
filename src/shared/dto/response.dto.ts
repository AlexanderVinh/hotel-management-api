// src/shared/dto/response.dto.ts
export class PaginationMetadata {
    constructor(
        public readonly total_pages: number,
        public readonly has_next: boolean,
        public readonly has_previous: boolean,
        public readonly current_page: number,
        public readonly total_elements: number,
    ) { }
}

export class ResponseApi<T> {
    constructor(
        public data: T,
        public message: string,
    ) { }

    static create<T>(data: T, message: string = ""): ResponseApi<T> {
        return new ResponseApi<T>(data, message);
    }
}

export class PaginatedResponse<T> {
    constructor(
        public data: T,
        public page: PaginationMetadata,
        public extended_data: any,
        public message: string,
    ) { }

    static create<T>(
        data: T,
        total_elements: number = 0,
        page: number = 1,
        size: number = 10,
        extended_data?: any,
    ): PaginatedResponse<T> {
        const total_pages = Math.ceil(total_elements / size);
        const page_meta = new PaginationMetadata(
            total_pages,
            page < total_pages,
            page > 1,
            page,
            total_elements
        );

        return new PaginatedResponse<T>(data, page_meta, extended_data, 'SUCCESS');
    }
}