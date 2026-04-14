export class TokenResponseDto {
    accessToken: string;
    refreshToken: string;
    permissions: string[];

    constructor(accessToken: string, refreshToken: string, permissions: string[]) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.permissions = permissions;
    }
}