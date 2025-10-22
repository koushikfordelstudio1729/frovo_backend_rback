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
exports.AuditLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const auditTargetSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: [true, 'Target type is required'],
        trim: true
    },
    id: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: [true, 'Target ID is required']
    },
    name: {
        type: String,
        trim: true
    }
}, { _id: false });
const auditChangesSchema = new mongoose_1.Schema({
    before: {
        type: mongoose_1.Schema.Types.Mixed
    },
    after: {
        type: mongoose_1.Schema.Types.Mixed
    }
}, { _id: false });
const auditLogSchema = new mongoose_1.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    actor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Actor is required']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        trim: true,
        maxlength: [100, 'Action cannot exceed 100 characters']
    },
    module: {
        type: String,
        required: [true, 'Module is required'],
        trim: true,
        maxlength: [50, 'Module cannot exceed 50 characters']
    },
    target: {
        type: auditTargetSchema,
        required: [true, 'Target is required']
    },
    changes: {
        type: auditChangesSchema
    },
    ipAddress: {
        type: String,
        trim: true,
        match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address format']
    },
    userAgent: {
        type: String,
        trim: true,
        maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    metadata: {
        type: Map,
        of: mongoose_1.Schema.Types.Mixed
    }
}, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, timestamp: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, module: 1, timestamp: -1 });
auditLogSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
auditLogSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, ...cleanRet } = ret;
        return cleanRet;
    }
});
exports.AuditLog = mongoose_1.default.model('AuditLog', auditLogSchema);
//# sourceMappingURL=AuditLog.model.js.map