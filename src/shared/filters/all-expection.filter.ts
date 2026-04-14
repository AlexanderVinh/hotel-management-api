import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

export interface HttpExceptionResponse {
    statusCode: number;
    message: any;
    errors?: any;
    error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const errorResponse = exception instanceof HttpException ? exception.getResponse() : null;

        let message: any = null;
        let errors: any = null;

        if (errorResponse && typeof errorResponse === 'object') {
            const err = errorResponse as HttpExceptionResponse;
            message = err.message ?? null;
            errors = err.errors ?? null;
        } else {
            message = errorResponse || exception.message || 'Internal server error';
        }

        if (!(exception instanceof HttpException)) {
            console.error('Unhandled exception:', exception);
        }

        const jsonResponse: any = {
            statusCode: status,
            message,
        };

        if (errors) {
            jsonResponse.errors = errors;
        }

        return response.status(status).json(jsonResponse);
    }
}
