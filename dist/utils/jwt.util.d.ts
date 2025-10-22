import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
export interface JWTPayload extends jwt.JwtPayload {
    id: string;
    type: 'access' | 'refresh';
}
export declare const generateAccessToken: (userId: Types.ObjectId | string) => string;
export declare const generateRefreshToken: (userId: Types.ObjectId | string) => string;
export declare const verifyAccessToken: (token: string) => JWTPayload;
export declare const verifyRefreshToken: (token: string) => JWTPayload;
export declare const generateTokenPair: (userId: Types.ObjectId | string) => {
    accessToken: string;
    refreshToken: string;
};
//# sourceMappingURL=jwt.util.d.ts.map