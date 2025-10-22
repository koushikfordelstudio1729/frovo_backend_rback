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
exports.AccessRequest = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("./enums");
const accessRequestSchema = new mongoose_1.Schema({
    requester: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Requester is required']
    },
    requestedRole: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Role'
    },
    requestedPermissions: [{
            type: String,
            trim: true
        }],
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true,
        minlength: [10, 'Reason must be at least 10 characters'],
        maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    duration: {
        type: Number,
        min: [1, 'Duration must be at least 1 day'],
        max: [365, 'Duration cannot exceed 365 days']
    },
    approver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: Object.values(enums_1.AccessRequestStatus),
        default: enums_1.AccessRequestStatus.PENDING
    },
    approvedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
accessRequestSchema.index({ requester: 1 });
accessRequestSchema.index({ status: 1 });
accessRequestSchema.index({ expiresAt: 1 });
accessRequestSchema.index({ createdAt: -1 });
accessRequestSchema.index({ requester: 1, status: 1 });
accessRequestSchema.pre('save', function (next) {
    if (!this.requestedRole && (!this.requestedPermissions || this.requestedPermissions.length === 0)) {
        return next(new Error('Either requestedRole or requestedPermissions must be provided'));
    }
    if (this.status === enums_1.AccessRequestStatus.APPROVED && this.duration && !this.expiresAt) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.duration);
        this.expiresAt = expiryDate;
    }
    next();
});
accessRequestSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
accessRequestSchema.virtual('isExpired').get(function () {
    if (!this.expiresAt)
        return false;
    return new Date() > this.expiresAt;
});
accessRequestSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, ...cleanRet } = ret;
        return cleanRet;
    }
});
exports.AccessRequest = mongoose_1.default.model('AccessRequest', accessRequestSchema);
//# sourceMappingURL=AccessRequest.model.js.map