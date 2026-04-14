import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class PostInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();

        return next.handle().pipe(
            map((data) => {
                if (req.method === 'POST') {
                    if (res.statusCode === HttpStatus.CREATED) {
                        res.status(HttpStatus.OK);
                    }
                }

                return data;
            }),
        );
    }
}
