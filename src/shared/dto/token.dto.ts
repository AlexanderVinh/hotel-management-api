
export class CreateTokenDto {
    userId: string;
    tokenId: string;
    type: string;

    constructor(userId: string, tokenId: string, type: string) {
        this.userId = userId;
        this.tokenId = tokenId;
        this.type = type;
    }
}