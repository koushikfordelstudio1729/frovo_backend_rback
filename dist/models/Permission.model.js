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
exports.Permission = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const enums_1 = require("./enums");
const permissionSchema = new mongoose_1.Schema({
    key: {
        type: String,
        unique: true,
        required: [true, "Permission key is required"],
        lowercase: true,
    },
    module: {
        type: String,
        enum: Object.values(enums_1.PermissionModule),
        required: [true, "Module is required"],
    },
    action: {
        type: String,
        enum: Object.values(enums_1.PermissionAction),
        required: [true, "Action is required"],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        trim: true,
        maxlength: [200, "Description cannot exceed 200 characters"],
    },
    group: {
        type: String,
        required: [true, "Group is required"],
        trim: true,
        maxlength: [50, "Group cannot exceed 50 characters"],
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
permissionSchema.index({ module: 1 });
permissionSchema.index({ group: 1 });
permissionSchema.index({ module: 1, action: 1 });
permissionSchema.pre("save", function (next) {
    if (this.isModified("module") || this.isModified("action") || !this.key) {
        this.key = `${this.module}:${this.action}`;
    }
    next();
});
permissionSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
permissionSchema.set("toJSON", {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, ...cleanRet } = ret;
        return cleanRet;
    },
});
exports.Permission = mongoose_1.default.model("Permission", permissionSchema);
