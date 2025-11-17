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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const enums_1 = require("./enums");
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[+]?[\s\d-()]+$/, 'Please provide a valid phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    departments: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Department'
        }],
    roles: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Role'
        }],
    status: {
        type: String,
        enum: Object.values(enums_1.UserStatus),
        default: enums_1.UserStatus.ACTIVE
    },
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String,
        select: false
    },
    lastLogin: {
        type: Date
    },
    refreshTokens: [{
            token: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            expiresAt: {
                type: Date,
                required: true
            },
            deviceInfo: {
                type: String
            },
            ipAddress: {
                type: String
            },
            userAgent: {
                type: String
            }
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
userSchema.index({ status: 1 });
userSchema.index({ departments: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ createdAt: -1 });
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcrypt.genSalt(parseInt(process.env['BCRYPT_ROUNDS'] || '10'));
        this.password = await bcrypt.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.methods['comparePassword'] = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this['password']);
};
userSchema.methods['getPermissions'] = async function () {
    await this['populate']('roles');
    const permissions = new Set();
    for (const role of this['roles']) {
        if (role.permissions.includes('*:*')) {
            return ['*:*'];
        }
        role.permissions.forEach((permission) => permissions.add(permission));
    }
    return Array.from(permissions);
};
userSchema.methods['addRefreshToken'] = async function (token, deviceInfo, ipAddress, userAgent) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    this['refreshTokens'] = this['refreshTokens'].filter((rt) => rt.expiresAt > new Date());
    if (this['refreshTokens'].length >= 5) {
        this['refreshTokens'].shift();
    }
    this['refreshTokens'].push({
        token,
        createdAt: new Date(),
        expiresAt,
        deviceInfo,
        ipAddress,
        userAgent
    });
    await this['save']();
};
userSchema.methods['removeRefreshToken'] = async function (token) {
    this['refreshTokens'] = this['refreshTokens'].filter((rt) => rt.token !== token);
    await this['save']();
};
userSchema.methods['clearAllRefreshTokens'] = async function () {
    this['refreshTokens'] = [];
    await this['save']();
};
userSchema.methods['isRefreshTokenValid'] = function (token) {
    const refreshToken = this['refreshTokens'].find((rt) => rt.token === token);
    if (!refreshToken) {
        return false;
    }
    if (refreshToken.expiresAt < new Date()) {
        this['refreshTokens'] = this['refreshTokens'].filter((rt) => rt.token !== token);
        this['save']();
        return false;
    }
    return true;
};
userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
userSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, password, mfaSecret, ...cleanRet } = ret;
        return cleanRet;
    }
});
exports.User = mongoose_1.default.model('User', userSchema);
