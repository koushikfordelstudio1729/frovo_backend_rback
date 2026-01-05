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
exports.VendorDashboard = exports.VendorCreate = exports.CompanyCreate = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const companyCreateSchema = new mongoose_1.Schema({
    registered_company_name: {
        type: String,
        required: true,
        trim: true
    },
    company_address: {
        type: String,
        required: true,
        trim: true
    },
    office_email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    legal_entity_structure: {
        type: String,
        required: true,
        trim: true
    },
    cin: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    gst_number: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        unique: true
    },
    date_of_incorporation: {
        type: Date,
        required: true
    },
    corporate_website: {
        type: String,
        required: false,
        trim: true
    },
    directory_signature_name: {
        type: String,
        required: true,
        trim: true
    },
    din: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    company_status: {
        type: String,
        enum: ['active', 'inactive', 'blacklisted', 'under_review'],
        default: 'active',
        required: true
    },
    risk_rating: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        required: true
    }
}, {
    timestamps: true,
    collection: 'companies'
});
exports.CompanyCreate = mongoose_1.default.model('CompanyCreate', companyCreateSchema);
const vendorDocumentSchema = new mongoose_1.Schema({
    document_name: {
        type: String,
        required: true,
        trim: true
    },
    document_type: {
        type: String,
        enum: ['signed_contract', 'gst_certificate', 'msme_certificate', 'tds_exemption', 'pan_card', 'bank_proof', 'other'],
        required: true
    },
    file_url: {
        type: String,
        required: true
    },
    cloudinary_public_id: {
        type: String,
        required: true
    },
    file_size: {
        type: Number,
        required: true
    },
    mime_type: {
        type: String,
        required: true
    },
    expiry_date: {
        type: Date,
        required: false
    },
    uploaded_at: {
        type: Date,
        default: Date.now
    }
}, { _id: true });
const vendorCreateSchema = new mongoose_1.Schema({
    vendor_name: {
        type: String,
        required: true,
        trim: true
    },
    vendor_billing_name: {
        type: String,
        required: true,
        trim: true
    },
    vendor_type: [{
            type: String,
            enum: ['snacks', 'beverages', 'packaging', 'services', 'raw_materials', 'equipment', 'maintenance'],
            required: true
        }],
    vendor_category: {
        type: String,
        required: true,
        enum: ['consumables', 'packaging', 'logistics', 'maintenance', 'services', 'equipment'],
        trim: true
    },
    material_categories_supplied: [{
            type: String,
            required: false,
            trim: true
        }],
    primary_contact_name: {
        type: String,
        required: true,
        trim: true
    },
    contact_phone: {
        type: String,
        required: true,
        trim: true
    },
    vendor_email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    vendor_address: {
        type: String,
        required: true,
        trim: true
    },
    vendor_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    cin: {
        type: String,
        required: true,
        trim: true,
        references: 'CompanyCreate',
        validate: {
            validator: async function (value) {
                const company = await mongoose_1.default.model('CompanyCreate').findOne({
                    cin: value
                });
                return !!company;
            },
            message: 'Company with this registration number does not exist'
        }
    },
    warehouse_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    bank_account_number: {
        type: String,
        required: true,
        trim: true
    },
    ifsc_code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    payment_terms: {
        type: String,
        required: true,
        enum: ['net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'immediate'],
        default: 'net_30',
        trim: true
    },
    payment_methods: {
        type: String,
        required: true,
        enum: ['neft', 'imps', 'upi', 'cheque', 'rtgs', 'multiple'],
        default: 'neft'
    },
    gst_number: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    pan_number: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    tds_rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 1
    },
    billing_cycle: {
        type: String,
        required: true,
        enum: ['weekly', 'monthly', 'per_po', 'quarterly'],
        default: 'monthly'
    },
    vendor_status_cycle: {
        type: String,
        required: true,
        enum: ['procurement', 'restocking', 'finance_reconciliation', 'audit'],
        default: 'procurement'
    },
    vendor_status: {
        type: String,
        enum: ['active', 'inactive', 'deactivated'],
        default: 'active',
        required: true
    },
    verification_status: {
        type: String,
        enum: ['draft', 'pending', 'under_review', 'verified', 'rejected', 'failed', 'suspended', 'contract_expired', 'blacklisted'],
        required: true,
        default: 'draft'
    },
    risk_rating: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
        default: 'medium'
    },
    risk_notes: {
        type: String,
        required: false,
        trim: true,
        default: ''
    },
    verified_by: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    contract_terms: {
        type: String,
        required: false,
        trim: true,
        default: ''
    },
    contract_expiry_date: {
        type: Date,
        required: true
    },
    contract_renewal_date: {
        type: Date,
        required: true
    },
    documents: [vendorDocumentSchema],
    internal_notes: {
        type: String,
        required: false,
        trim: true,
        default: ''
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    collection: 'vendors'
});
vendorCreateSchema.pre('save', function (next) {
    if (!this.vendor_id) {
        const timestamp = new Date().getTime().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        this.vendor_id = `VEND-${timestamp}-${random}`;
    }
    if (this.contract_expiry_date <= this.contract_renewal_date) {
        return next(new Error('Contract expiry date must be after renewal date'));
    }
    if (this.isModified('verification_status') &&
        (this.verification_status === 'verified' || this.verification_status === 'rejected' || this.verification_status === 'failed')) {
        if (!this.verified_by) {
            return next(new Error('Verified_by field is required when verification status is changed'));
        }
    }
    next();
});
vendorCreateSchema.index({ vendor_email: 1 }, { unique: true });
vendorCreateSchema.index({ vendor_id: 1 }, { unique: true });
vendorCreateSchema.index({ verification_status: 1 });
vendorCreateSchema.index({ risk_rating: 1 });
vendorCreateSchema.index({ vendor_category: 1 });
vendorCreateSchema.index({ createdBy: 1 });
vendorCreateSchema.index({ contract_expiry_date: 1 });
exports.VendorCreate = mongoose_1.default.model('VendorCreate', vendorCreateSchema);
const vendorDashboardSchema = new mongoose_1.Schema({
    total_vendors: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    pending_approvals: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    active_vendors: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    rejected_vendors: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    vendors: [{
            vendor_name: {
                type: String,
                required: true,
                trim: true
            },
            vendor_category: {
                type: String,
                required: true,
                trim: true
            },
            verification_status: {
                type: String,
                enum: ['pending', 'verified', 'failed', 'rejected'],
                required: true,
                default: 'pending'
            },
            risk_level: {
                type: String,
                enum: ['low', 'medium', 'high'],
                required: true,
                default: 'medium'
            },
            contract_expiry_date: {
                type: Date,
                required: true
            },
            action: {
                type: String,
                enum: ['edit', 'delete'],
                required: true,
                default: 'edit'
            }
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    collection: 'vendordashboards'
});
vendorDashboardSchema.index({ createdBy: 1 });
exports.VendorDashboard = mongoose_1.default.model('VendorDashboard', vendorDashboardSchema);
