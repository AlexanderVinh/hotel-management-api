import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { COOKIE_NAME, HOTEL_ACCESS_SECRET_KEY } from 'src/config';
// import { Token } from 'src/schemas/session.schema';

type JwtPayload = {
    userId: string;
    sessionIdRefresh: string;
    sessionIdAccess: string;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        // @InjectModel('Token') private tokenModel: Model<Token>
    ) {
        super({
            // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // 👇 SỬA ĐOẠN NÀY: Dạy máy quét cách tìm thẻ trong Cookie
            jwtFromRequest: (req) => {
                let token = null;
                if (req && req.cookies) {
                    token = req.cookies[COOKIE_NAME]; // Lấy thẻ từ chiếc hộp an toàn
                }
                return token;
            },
            ignoreExpiration: false,
            secretOrKey: HOTEL_ACCESS_SECRET_KEY,
        });
    }

    async validate(payload: JwtPayload) {
        // const token = await this.tokenModel.findOne({
        //     tokenId: payload.sessionIdAccess,
        //     userId: payload.userId,
        // });
        // if (!token) {
        //     throw new UnauthorizedException();
        // }
        return payload;
    }
}
