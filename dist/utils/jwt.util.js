"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenPair = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const generateAccessToken = (userId) => {
    const payload = {
        id: userId.toString(),
        type: 'access'
    };
    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    return jwt.sign(payload, secret, {
        expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] || '1d',
        issuer: 'frovo-rbac',
        audience: 'frovo-users'
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId) => {
    const payload = {
        id: userId.toString(),
        type: 'refresh'
    };
    const secret = process.env['JWT_REFRESH_SECRET'];
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    return jwt.sign(payload, secret, {
        expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
        issuer: 'frovo-rbac',
        audience: 'frovo-users'
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    try {
        const secret = process.env['JWT_ACCESS_SECRET'];
        if (!secret) {
            throw new Error('JWT_ACCESS_SECRET is not defined');
        }
        const decoded = jwt.verify(token, secret);
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired');
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        else {
            throw error;
        }
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        const secret = process.env['JWT_REFRESH_SECRET'];
        if (!secret) {
            throw new Error('JWT_REFRESH_SECRET is not defined');
        }
        const decoded = jwt.verify(token, secret);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token has expired');
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        else {
            throw error;
        }
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const generateTokenPair = (userId) => {
    return {
        accessToken: (0, exports.generateAccessToken)(userId),
        refreshToken: (0, exports.generateRefreshToken)(userId)
    };
};
exports.generateTokenPair = generateTokenPair;
