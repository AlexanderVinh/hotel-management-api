
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { HOTEL_REFRESH_SECRET_KEY } from 'src/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: HOTEL_REFRESH_SECRET_KEY,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        console.log('payload: ', payload);
        return payload;
    }
}
