
import {
    ValidationPipe,
    BadRequestException,
    ValidationError,
    ValidationPipeOptions,
} from '@nestjs/common';

const formatValidationErrors = (errors: ValidationError[]) => {
    const messageList: string[] = [];
    const errorDetails: Record<string, any> = {};

    const recurse = (errs: ValidationError[], parentKey?: string) => {
        errs.forEach((err) => {
            const key = parentKey ? `${parentKey}.${err.property}` : err.property;

            if (err.constraints) {
                // Object.values(err.constraints).forEach((msg) => {
                //   if (!messageList.includes(msg)) {
                //     messageList.push(msg);
                //   }
                // });

                // if (!parentKey) {
                //   errorDetails[err.property] = Object.values(err.constraints);
                // } else {
                //   let pointer = errorDetails;
                //   const parts = parentKey.split('.');
                //   for (const part of parts) {
                //     if (!pointer[part]) pointer[part] = {};
                //     pointer = pointer[part];
                //   }
                //   pointer[err.property] = Object.values(err.constraints);
                // }
                const priority = ['isDefined', 'isNotEmpty', 'maxLength', 'matches'];
                let firstMsg: string | undefined;

                for (const key of priority) {
                    if (err.constraints[key]) {
                        firstMsg = err.constraints[key];
                        break;
                    }
                }

                if (!firstMsg) {
                    firstMsg = Object.values(err.constraints)[0];
                }

                if (!messageList.includes(firstMsg)) {
                    messageList.push(firstMsg);
                }

                if (!parentKey) {
                    errorDetails[err.property] = firstMsg;
                } else {
                    let pointer = errorDetails;
                    const parts = parentKey.split('.');
                    for (const part of parts) {
                        if (!pointer[part]) pointer[part] = {};
                        pointer = pointer[part];
                    }
                    pointer[err.property] = firstMsg;
                }
            }

            if (err.children && err.children.length > 0) {
                recurse(err.children, key);
            }
        });
    }

    recurse(errors);

    console.log('errorDetails: ', errorDetails);
    return {
        statusCode: 400,
        message: messageList,
        errors: errorDetails,
    };
}

export class CustomValidationPipe extends ValidationPipe {
    constructor(options?: ValidationPipeOptions) {
        super({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            // forbidNonWhitelisted: false,
            exceptionFactory: (errors) => {
                const formatted = formatValidationErrors(errors);
                return new BadRequestException(formatted);
            },
            ...options,
        });
    }
}