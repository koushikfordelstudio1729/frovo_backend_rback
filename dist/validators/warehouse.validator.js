"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardQuerySchema = exports.updateExpensePaymentStatusSchema = exports.updateExpenseStatusSchema = exports.updateExpenseSchema = exports.createExpenseSchema = exports.updateInventorySchema = exports.updateQCSchema = exports.warehouseReportSchema = exports.createFieldAgentSchema = exports.createReturnOrderSchema = exports.applyQCTemplateSchema = exports.createQCTemplateSchema = exports.updateDispatchStatusSchema = exports.createDispatchSchema = exports.receiveGoodsSchema = void 0;
const zod_1 = require("zod");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
exports.receiveGoodsSchema = zod_1.z.object({
    body: zod_1.z.object({
        poNumber: zod_1.z.string().min(1, 'PO Number is required'),
        vendor: objectIdSchema,
        sku: zod_1.z.string().min(1, 'SKU is required'),
        productName: zod_1.z.string().min(1, 'Product name is required'),
        quantity: zod_1.z.number().min(1, 'Quantity must be at least 1'),
        batchId: zod_1.z.string().min(1, 'Batch ID is required').optional(),
        warehouse: objectIdSchema,
        qcVerification: zod_1.z.object({
            packaging: zod_1.z.boolean(),
            expiry: zod_1.z.boolean(),
            label: zod_1.z.boolean()
        }),
        storage: zod_1.z.object({
            zone: zod_1.z.string().min(1, 'Zone is required'),
            aisle: zod_1.z.string().min(1, 'Aisle is required'),
            rack: zod_1.z.string().min(1, 'Rack is required'),
            bin: zod_1.z.string().min(1, 'Bin is required')
        }),
        documents: zod_1.z.array(zod_1.z.string()).optional()
    })
});
exports.createDispatchSchema = zod_1.z.object({
    body: zod_1.z.object({
        dispatchId: zod_1.z.string().min(1, 'Dispatch ID is required'),
        destination: zod_1.z.string().min(1, 'Destination is required'),
        products: zod_1.z.array(zod_1.z.object({
            sku: zod_1.z.string().min(1, 'SKU is required'),
            quantity: zod_1.z.number().min(1, 'Quantity must be at least 1')
        })).min(1, 'At least one product is required'),
        assignedAgent: objectIdSchema,
        notes: zod_1.z.string().max(500, 'Notes too long').optional(),
        status: zod_1.z.enum(['pending', 'assigned', 'in_transit', 'delivered', 'cancelled']).optional()
    })
});
exports.updateDispatchStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'])
    })
});
exports.createQCTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string()
            .trim()
            .min(1, 'Template Title is required'),
        sku: zod_1.z.string()
            .trim()
            .min(1, 'SKU is required'),
        parameters: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string()
                .trim()
                .min(1, 'Parameter name is required'),
            value: zod_1.z.string()
                .trim()
                .min(1, 'Value is required')
        }))
            .min(1, 'At least one parameter required')
            .refine((params) => {
            const names = params.map(p => p.name.toLowerCase());
            return new Set(names).size === names.length;
        }, { message: 'Duplicate parameter names are not allowed' })
    })
});
exports.applyQCTemplateSchema = zod_1.z.object({
    body: zod_1.z.object({
        templateId: objectIdSchema,
        batchId: zod_1.z.string().min(1, 'Batch ID is required')
    })
});
exports.createReturnOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        batchId: zod_1.z.string().min(1, 'Batch ID is required'),
        vendor: objectIdSchema,
        reason: zod_1.z.string().min(1, 'Reason is required'),
        status: zod_1.z.enum(['pending', 'approved', 'returned', 'rejected']).optional().default('pending'),
        quantity: zod_1.z.number().min(1, 'Quantity must be at least 1').optional().default(1),
    })
});
exports.createFieldAgentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        assignedRoutes: zod_1.z.string().optional()
    })
});
exports.warehouseReportSchema = zod_1.z.object({
    query: zod_1.z.object({
        type: zod_1.z.enum(['inventory_turnover', 'qc_summary', 'efficiency', 'stock_ageing']),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        warehouse: objectIdSchema.optional(),
        category: zod_1.z.string().optional(),
        format: zod_1.z.enum(['json', 'csv']).default('json')
    })
});
exports.updateQCSchema = zod_1.z.object({
    body: zod_1.z.object({
        qcVerification: zod_1.z.object({
            packaging: zod_1.z.boolean().optional(),
            expiry: zod_1.z.boolean().optional(),
            label: zod_1.z.boolean().optional(),
            documents: zod_1.z.array(zod_1.z.string()).optional()
        })
    })
});
exports.updateInventorySchema = zod_1.z.object({
    body: zod_1.z.object({
        sku: zod_1.z.string().optional(),
        productName: zod_1.z.string().optional(),
        batchId: zod_1.z.string().optional(),
        quantity: zod_1.z.number().min(0).optional(),
        expiryDate: zod_1.z.string().datetime().optional(),
        location: zod_1.z.object({
            zone: zod_1.z.string().optional(),
            aisle: zod_1.z.string().optional(),
            rack: zod_1.z.string().optional(),
            bin: zod_1.z.string().optional()
        }).optional(),
        minStockLevel: zod_1.z.number().min(0).optional(),
        maxStockLevel: zod_1.z.number().min(1).optional()
    })
});
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.enum(['staffing', 'supplies', 'equipment', 'transport']),
        amount: zod_1.z.number().min(1),
        vendor: objectIdSchema,
        date: zod_1.z.string().datetime(),
        description: zod_1.z.string().max(200).optional(),
        billUrl: zod_1.z.string().url().optional(),
        assignedAgent: objectIdSchema,
        warehouseId: objectIdSchema,
        status: zod_1.z.enum(['approved', 'pending']).optional()
    })
});
exports.updateExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.enum(['staffing', 'supplies', 'equipment', 'transport']).optional(),
        amount: zod_1.z.number().min(1).optional(),
        date: zod_1.z.string().datetime().optional(),
        description: zod_1.z.string().max(200).optional(),
        status: zod_1.z.enum(['approved', 'pending']).optional(),
        assignedAgent: objectIdSchema.optional()
    })
});
exports.updateExpenseStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['approved', 'pending', 'rejected'])
    })
});
exports.updateExpensePaymentStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        paymentStatus: zod_1.z.enum(['paid', 'unpaid', 'partially_paid'])
    })
});
exports.dashboardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        date: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        partner: zod_1.z.string().optional(),
        warehouseId: objectIdSchema.optional()
    })
});
