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
exports.Role = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("./enums");
const scopeSchema = new mongoose_1.Schema({
    level: {
        type: String,
        enum: Object.values(enums_1.ScopeLevel),
        required: [true, 'Scope level is required']
    },
    entities: [{
            type: mongoose_1.Schema.Types.ObjectId,
            refPath: 'scope.level'
        }]
}, { _id: false });
const roleSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        trim: true,
        minlength: [2, 'Role name must be at least 2 characters'],
        maxlength: [100, 'Role name cannot exceed 100 characters']
    },
    key: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    systemRole: {
        type: String,
        enum: Object.values(enums_1.SystemRole),
        sparse: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    type: {
        type: String,
        enum: Object.values(enums_1.RoleType),
        default: enums_1.RoleType.CUSTOM
    },
    department: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Department'
    },
    permissions: [{
            type: String,
            required: true
        }],
    scope: {
        type: scopeSchema,
        required: [true, 'Scope is required']
    },
    uiAccess: {
        type: String,
        enum: Object.values(enums_1.UIAccess),
        required: [true, 'UI Access is required']
    },
    status: {
        type: String,
        enum: Object.values(enums_1.RoleStatus),
        default: enums_1.RoleStatus.DRAFT
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'CreatedBy is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
roleSchema.index({ key: 1 });
roleSchema.index({ type: 1 });
roleSchema.index({ status: 1 });
roleSchema.index({ department: 1 });
roleSchema.index({ systemRole: 1 });
roleSchema.index({ createdAt: -1 });
roleSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.key) {
        this.key = this.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');
    }
    next();
});
roleSchema.pre('save', function (next) {
    if (this.type === enums_1.RoleType.SYSTEM && this.key && !this.systemRole) {
        const systemRoleKey = this.key.toUpperCase();
        if (enums_1.SystemRole[systemRoleKey]) {
            this.systemRole = enums_1.SystemRole[systemRoleKey];
        }
    }
    next();
});
roleSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
roleSchema.set('toJSON', {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, ...cleanRet } = ret;
        return cleanRet;
    }
});
exports.Role = mongoose_1.default.model('Role', roleSchema);
//# sourceMappingURL=Role.model.js.map