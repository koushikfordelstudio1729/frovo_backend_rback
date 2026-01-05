"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWarehousesQuerySchema = exports.updateWarehouseSchema = exports.createWarehouseSchema = exports.dashboardQuerySchema = exports.updateExpensePaymentStatusSchema = exports.updateExpenseStatusSchema = exports.updateExpenseSchema = exports.createExpenseSchema = exports.updateInventorySchema = exports.updateQCSchema = exports.warehouseReportSchema = exports.createFieldAgentSchema = exports.createReturnOrderSchema = exports.applyQCTemplateSchema = exports.createQCTemplateSchema = exports.updateDispatchStatusSchema = exports.createDispatchSchema = exports.updatePurchaseOrderStatusSchema = exports.updateGRNStatusSchema = exports.createGRNSchema = exports.createPurchaseOrderSchema = exports.createInventorySchema = void 0;
const zod_1 = require("zod");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
exports.createInventorySchema = zod_1.z.object({
    body: zod_1.z.object({
        sku: zod_1.z.string().min(1, 'SKU is required'),
        productName: zod_1.z.string().min(1, 'Product name is required'),
        po_number: zod_1.z.string().min(1, 'PO number is required'),
        quantity: zod_1.z.number().min(0, 'Quantity must be positive'),
        expiry_date: zod_1.z.string().datetime().optional(),
        minStockLevel: zod_1.z.number().min(0).optional(),
        maxStockLevel: zod_1.z.number().min(0).optional()
    })
});
exports.createPurchaseOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        vendor: zod_1.z.string().min(1, 'Vendor is required'),
        warehouse: objectIdSchema.optional(),
        po_raised_date: zod_1.z.string().datetime().optional(),
        po_status: zod_1.z.enum(['draft', 'approved', 'pending']).default('draft'),
        remarks: zod_1.z.string().optional(),
        po_line_items: zod_1.z.array(zod_1.z.object({
            line_no: zod_1.z.number().min(1, 'Line number is required'),
            sku: zod_1.z.string().min(1, 'SKU is required'),
            productName: zod_1.z.string().min(1, 'Product name is required'),
            quantity: zod_1.z.number().min(1, 'Quantity must be at least 1'),
            category: zod_1.z.string().min(1, 'Category is required'),
            pack_size: zod_1.z.string().min(1, 'Pack size is required'),
            uom: zod_1.z.string().min(1, 'Unit of measure is required'),
            unit_price: zod_1.z.number().min(0, 'Unit price must be positive'),
            expected_delivery_date: zod_1.z.string().datetime('Valid delivery date required'),
            location: zod_1.z.string().min(1, 'Location is required')
        })).optional().default([])
    })
});
exports.createGRNSchema = zod_1.z.object({
    body: zod_1.z.object({
        delivery_challan: zod_1.z.string().min(1, 'Delivery challan number is required'),
        transporter_name: zod_1.z.string().min(1, 'Transporter name is required'),
        vehicle_number: zod_1.z.string().min(1, 'Vehicle number is required'),
        received_date: zod_1.z.string().datetime().optional(),
        remarks: zod_1.z.string().optional(),
        scanned_challan: zod_1.z.string().url('Valid URL required').optional(),
        qc_status: zod_1.z.enum(['bad', 'moderate', 'excellent'], {
            required_error: 'QC status is required'
        }),
        quantities: zod_1.z.union([
            zod_1.z.string().transform((str, ctx) => {
                try {
                    const parsed = JSON.parse(str);
                    return parsed;
                }
                catch (e) {
                    ctx.addIssue({
                        code: zod_1.z.ZodIssueCode.custom,
                        message: 'Invalid JSON string for quantities',
                    });
                    return zod_1.z.NEVER;
                }
            }),
            zod_1.z.array(zod_1.z.object({
                sku: zod_1.z.string().min(1, 'SKU is required'),
                received_quantity: zod_1.z.number().min(0, 'Received quantity must be positive'),
                accepted_quantity: zod_1.z.number().min(0, 'Accepted quantity must be positive'),
                rejected_quantity: zod_1.z.number().min(0, 'Rejected quantity must be positive'),
                expiry_date: zod_1.z.string().datetime().optional(),
                item_remarks: zod_1.z.string().optional()
            }))
        ]).optional()
    })
});
exports.updateGRNStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        qc_status: zod_1.z.enum(['bad', 'moderate', 'excellent'], {
            required_error: 'QC status is required'
        }),
        remarks: zod_1.z.string().optional()
    })
});
exports.updatePurchaseOrderStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        po_status: zod_1.z.enum(['draft', 'approved', 'delivered'], {
            required_error: 'Purchase order status is required'
        }),
        remarks: zod_1.z.string().optional()
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
        warehouse: objectIdSchema.optional(),
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
        warehouse: objectIdSchema.optional(),
        reason: zod_1.z.string().min(1, 'Reason is required'),
        status: zod_1.z.enum(['pending', 'approved', 'returned', 'rejected']).optional().default('pending'),
        quantity: zod_1.z.number().min(1, 'Quantity must be at least 1').optional().default(1),
    })
});
exports.createFieldAgentSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: objectIdSchema,
        assignedRoutes: zod_1.z.array(zod_1.z.string()).optional().default([])
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
exports.createWarehouseSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Warehouse name must be at least 2 characters')
            .max(100, 'Warehouse name cannot exceed 100 characters')
            .trim(),
        code: zod_1.z.string()
            .min(2, 'Warehouse code must be at least 2 characters')
            .max(20, 'Warehouse code cannot exceed 20 characters')
            .trim()
            .toUpperCase(),
        partner: zod_1.z.string()
            .min(1, 'Partner name is required')
            .trim(),
        location: zod_1.z.string()
            .min(5, 'Location must be at least 5 characters')
            .trim(),
        capacity: zod_1.z.number()
            .min(1, 'Capacity must be at least 1')
            .max(1000000, 'Capacity cannot exceed 1,000,000'),
        manager: objectIdSchema
    })
});
exports.updateWarehouseSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Warehouse name must be at least 2 characters')
            .max(100, 'Warehouse name cannot exceed 100 characters')
            .trim()
            .optional(),
        code: zod_1.z.string()
            .min(2, 'Warehouse code must be at least 2 characters')
            .max(20, 'Warehouse code cannot exceed 20 characters')
            .trim()
            .toUpperCase()
            .optional(),
        partner: zod_1.z.string()
            .min(1, 'Partner name is required')
            .trim()
            .optional(),
        location: zod_1.z.string()
            .min(5, 'Location must be at least 5 characters')
            .trim()
            .optional(),
        capacity: zod_1.z.number()
            .min(1, 'Capacity must be at least 1')
            .max(1000000, 'Capacity cannot exceed 1,000,000')
            .optional(),
        manager: objectIdSchema.optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
exports.getWarehousesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string()
            .optional()
            .default('1')
            .transform((val) => parseInt(val, 10))
            .refine((val) => val > 0, 'Page must be greater than 0'),
        limit: zod_1.z.string()
            .optional()
            .default('10')
            .transform((val) => parseInt(val, 10))
            .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
        search: zod_1.z.string().trim().optional(),
        isActive: zod_1.z.enum(['true', 'false']).optional(),
        partner: zod_1.z.string().trim().optional(),
        sortBy: zod_1.z.enum(['name', 'code', 'createdAt', 'capacity'])
            .optional()
            .default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc'])
            .optional()
            .default('desc')
    })
});
