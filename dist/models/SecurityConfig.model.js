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
exports.SecurityConfig = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ssoConfigSchema = new mongoose_1.Schema({
    clientId: {
        type: String,
        required: [true, 'SSO Client ID is required'],
        trim: true
    },
    clientSecret: {
        type: String,
        required: [true, 'SSO Client Secret is required'],
        select: false
    },
    metadataUrl: {
        type: String,
        required: [true, 'SSO Metadata URL is required'],
        trim: true,
        match: [/^https?:\/\/.+/, 'Invalid metadata URL format']
    }
}, { _id: false });
const passwordPolicySchema = new mongoose_1.Schema({
    minLength: {
        type: Number,
        default: 8,
        min: [6, 'Minimum password length cannot be less than 6'],
        max: [128, 'Minimum password length cannot exceed 128']
    },
    requireUppercase: {
        type: Boolean,
        default: true
    },
    requireLowercase: {
        type: Boolean,
        default: true
    },
    requireNumbers: {
        type: Boolean,
        default: true
    },
    requireSpecialChars: {
        type: Boolean,
        default: false
    },
    expiryDays: {
        type: Number,
        min: [1, 'Password expiry cannot be less than 1 day'],
        max: [365, 'Password expiry cannot exceed 365 days']
    }
}, { _id: false });
const securityConfigSchema = new mongoose_1.Schema({
    organizationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: [true, 'Organization ID is required'],
        unique: true
    },
    mfaEnforced: {
        type: Boolean,
        default: false
    },
    ipAllowlist: [{
            type: String,
            validate: {
                validator: function (ip) {
                    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
                    return cidrRegex.test(ip);
                },
                message: 'Invalid CIDR notation'
            }
        }],
    ssoEnabled: {
        type: Boolean,
        default: false
    },
    ssoConfig: {
        type: ssoConfigSchema
    },
    passwordPolicy: {
        type: passwordPolicySchema,
        required: true,
        default: () => ({})
    },
    sessionTimeout: {
        type: Number,
        default: 86400000,
        min: [300000, 'Session timeout cannot be less than 5 minutes'],
        max: [604800000, 'Session timeout cannot exceed 7 days']
    },
    maxLoginAttempts: {
        type: Number,
        default: 5,
        min: [3, 'Max login attempts cannot be less than 3'],
        max: [20, 'Max login attempts cannot exceed 20']
    },
    lockoutDuration: {
        type: Number,
        default: 900000,
        min: [60000, 'Lockout duration cannot be less than 1 minute'],
        max: [3600000, 'Lockout duration cannot exceed 1 hour']
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'UpdatedBy is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
securityConfigSchema.pre('save', function (next) {
    if (this.ssoEnabled && !this.ssoConfig) {
        return next(new Error('SSO configuration is required when SSO is enabled'));
    }
    if (!this.ssoEnabled) {
        this.ssoConfig = undefined;
    }
    next();
});
securityConfigSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
securityConfigSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, ...cleanRet } = ret;
        if (cleanRet.ssoConfig && cleanRet.ssoConfig.clientSecret) {
            cleanRet.ssoConfig = {
                clientId: cleanRet.ssoConfig.clientId,
                metadataUrl: cleanRet.ssoConfig.metadataUrl
            };
        }
        return cleanRet;
    }
});
exports.SecurityConfig = mongoose_1.default.model('SecurityConfig', securityConfigSchema);
