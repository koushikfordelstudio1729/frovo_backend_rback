// validators/warehouse.validator.ts
import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
// In your warehouse.validator.ts file, add these schemas:
// validation/warehouse.schemas.ts
export const createInventorySchema = z.object({
  body: z.object({
    sku: z.string().min(1, 'SKU is required'),
    productName: z.string().min(1, 'Product name is required'),
    po_number: z.string().min(1, 'PO number is required'),
    quantity: z.number().min(0, 'Quantity must be positive'),
    expiry_date: z.string().datetime().optional(),
    minStockLevel: z.number().min(0).optional(),
    maxStockLevel: z.number().min(0).optional()
  })
});
export const createPurchaseOrderSchema = z.object({
  body: z.object({
    //po_number: z.string().min(1, 'Purchase Order Number is required'),
    vendor: z.string().min(1, 'Vendor is required'),
    warehouse: objectIdSchema.optional(), // Warehouse ID (optional - will be auto-set for warehouse managers)
    po_raised_date: z.string().datetime().optional(),
    po_status: z.enum(['draft', 'approved', 'pending']).default('draft'),
    remarks: z.string().optional(),
       po_line_items: z.array(z.object({
      line_no: z.number().min(1, 'Line number is required'),
      sku: z.string().min(1, 'SKU is required'),
      productName: z.string().min(1, 'Product name is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      category: z.string().min(1, 'Category is required'),
      pack_size: z.string().min(1, 'Pack size is required'),
      uom: z.string().min(1, 'Unit of measure is required'),
      unit_price: z.number().min(0, 'Unit price must be positive'),
      expected_delivery_date: z.string().datetime('Valid delivery date required'),
      location: z.string().min(1, 'Location is required')
    })).optional().default([]) // Make sure this line exists
  })
});
// validators/warehouse.validator.ts

// validation/warehouse.schemas.ts - Update createGRNSchema

export const createGRNSchema = z.object({
  body: z.object({
    delivery_challan: z.string().min(1, 'Delivery challan number is required'),
    transporter_name: z.string().min(1, 'Transporter name is required'),
    vehicle_number: z.string().min(1, 'Vehicle number is required'),
    received_date: z.string().datetime().optional(), // Fixed spelling: received_date
    remarks: z.string().optional(),
    scanned_challan: z.string().url('Valid URL required').optional(), // Optional - can be provided via file upload
    qc_status: z.enum(['bad', 'moderate', 'excellent'], {
      required_error: 'QC status is required'
    }),
    // Add quantities field to validation - accept string or array
    quantities: z.union([
      z.string().transform((str, ctx) => {
        try {
          const parsed = JSON.parse(str);
          return parsed;
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid JSON string for quantities',
          });
          return z.NEVER;
        }
      }),
      z.array(z.object({
        sku: z.string().min(1, 'SKU is required'),
        received_quantity: z.number().min(0, 'Received quantity must be positive'),
        accepted_quantity: z.number().min(0, 'Accepted quantity must be positive'),
        rejected_quantity: z.number().min(0, 'Rejected quantity must be positive'),
        expiry_date: z.string().datetime().optional(),
        item_remarks: z.string().optional()
      }))
    ]).optional() // Make it optional in validation
  })
});
export const updateGRNStatusSchema = z.object({
  body: z.object({
    qc_status: z.enum(['bad', 'moderate', 'excellent'], {
      required_error: 'QC status is required'
    }),
    remarks: z.string().optional()
  })
});

export const updatePurchaseOrderStatusSchema = z.object({
  body: z.object({
    po_status: z.enum(['draft', 'approved', 'delivered'], {
      required_error: 'Purchase order status is required'
    }),
    remarks: z.string().optional()
  })
});

export const createDispatchSchema = z.object({
  body: z.object({
    dispatchId: z.string().min(1, 'Dispatch ID is required'),

    // merged field
    destination: z.string().min(1, 'Destination is required'),

    products: z.array(z.object({
      sku: z.string().min(1, 'SKU is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1')
    })).min(1, 'At least one product is required'),

    assignedAgent: objectIdSchema, // Agent required

    warehouse: objectIdSchema.optional(), // Optional because middleware may inject it

    notes: z.string().max(500, 'Notes too long').optional(),

    // status is optional because model defaults to "pending"
    status: z.enum(['pending', 'assigned', 'in_transit', 'delivered', 'cancelled']).optional()
  })
});
export const updateDispatchStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'])
  })
});


export const createQCTemplateSchema = z.object({
  body: z.object({
    title: z.string()
      .trim()
      .min(1, 'Template Title is required'),

    sku: z.string()
      .trim()
      .min(1, 'SKU is required'),

    parameters: z.array(
      z.object({
        name: z.string()
          .trim()
          .min(1, 'Parameter name is required'),

        value: z.string()
          .trim()
          .min(1, 'Value is required')
      })
    )
    .min(1, 'At least one parameter required')
    .refine(
      (params) => {
        const names = params.map(p => p.name.toLowerCase());
        return new Set(names).size === names.length;
      },
      { message: 'Duplicate parameter names are not allowed' }
    )
  })
});


export const applyQCTemplateSchema = z.object({
  body: z.object({
    templateId: objectIdSchema,
    batchId: z.string().min(1, 'Batch ID is required')
  })
});

// Update your createReturnOrderSchema
export const createReturnOrderSchema = z.object({
  body: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
    vendor: objectIdSchema,
    warehouse: objectIdSchema.optional(), // Optional because middleware may inject it
    reason: z.string().min(1, 'Reason is required'),
    status: z.enum(['pending', 'approved', 'returned', 'rejected']).optional().default('pending'),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional().default(1),
    // Remove required fields: sku, productName, returnType
    // They will be auto-populated
  })
});

export const createFieldAgentSchema = z.object({
  body: z.object({
    userId: objectIdSchema,
    assignedRoutes: z.array(z.string()).optional().default([])
  })
});


export const warehouseReportSchema = z.object({
  query: z.object({
    type: z.enum(['inventory_turnover', 'qc_summary', 'efficiency', 'stock_ageing']),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    warehouse: objectIdSchema.optional(),
    category: z.string().optional(),
    format: z.enum(['json', 'csv']).default('json')
  })
});

export const updateQCSchema = z.object({
  body: z.object({
    qcVerification: z.object({
      packaging: z.boolean().optional(),
      expiry: z.boolean().optional(),
      label: z.boolean().optional(),
      documents: z.array(z.string()).optional()
    })
  })
});

export const updateInventorySchema = z.object({
  body: z.object({
    sku: z.string().optional(),
    productName: z.string().optional(),
    batchId: z.string().optional(),

    quantity: z.number().min(0).optional(),
    expiryDate: z.string().datetime().optional(),

    location: z.object({
      zone: z.string().optional(),
      aisle: z.string().optional(),
      rack: z.string().optional(),
      bin: z.string().optional()
    }).optional(),

    minStockLevel: z.number().min(0).optional(),
    maxStockLevel: z.number().min(1).optional()
  })
});

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.enum(['staffing', 'supplies', 'equipment', 'transport']),
    amount: z.number().min(1),
    vendor: objectIdSchema,
    date: z.string().datetime(),
    description: z.string().max(200).optional(),
    billUrl: z.string().url().optional(),
    assignedAgent: objectIdSchema,
    warehouseId: objectIdSchema,
    status: z.enum(['approved', 'pending']).optional()
  })
});

export const updateExpenseSchema = z.object({
  body: z.object({
    category: z.enum(['staffing', 'supplies', 'equipment', 'transport']).optional(),
    amount: z.number().min(1).optional(),
    date: z.string().datetime().optional(),
    description: z.string().max(200).optional(),
    status: z.enum(['approved', 'pending']).optional(),
    assignedAgent: objectIdSchema.optional()
  })
});


export const updateExpenseStatusSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'pending', 'rejected'])
  })
});

export const updateExpensePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(['paid', 'unpaid', 'partially_paid'])
  })
});

// Add dashboard query schema
export const dashboardQuerySchema = z.object({
  query: z.object({
    date: z.string().optional(), // For custom date like "22-10-2025"
    category: z.string().optional(),
    partner: z.string().optional(),
    warehouseId: objectIdSchema.optional()
  })
});

// ==================== WAREHOUSE MANAGEMENT SCHEMAS ====================
export const createWarehouseSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Warehouse name must be at least 2 characters')
      .max(100, 'Warehouse name cannot exceed 100 characters')
      .trim(),
    code: z.string()
      .min(2, 'Warehouse code must be at least 2 characters')
      .max(20, 'Warehouse code cannot exceed 20 characters')
      .trim()
      .toUpperCase(),
    partner: z.string()
      .min(1, 'Partner name is required')
      .trim(),
    location: z.string()
      .min(5, 'Location must be at least 5 characters')
      .trim(),
    capacity: z.number()
      .min(1, 'Capacity must be at least 1')
      .max(1000000, 'Capacity cannot exceed 1,000,000'),
    manager: objectIdSchema
  })
});

export const updateWarehouseSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Warehouse name must be at least 2 characters')
      .max(100, 'Warehouse name cannot exceed 100 characters')
      .trim()
      .optional(),
    code: z.string()
      .min(2, 'Warehouse code must be at least 2 characters')
      .max(20, 'Warehouse code cannot exceed 20 characters')
      .trim()
      .toUpperCase()
      .optional(),
    partner: z.string()
      .min(1, 'Partner name is required')
      .trim()
      .optional(),
    location: z.string()
      .min(5, 'Location must be at least 5 characters')
      .trim()
      .optional(),
    capacity: z.number()
      .min(1, 'Capacity must be at least 1')
      .max(1000000, 'Capacity cannot exceed 1,000,000')
      .optional(),
    manager: objectIdSchema.optional(),
    isActive: z.boolean().optional()
  })
});

export const getWarehousesQuerySchema = z.object({
  query: z.object({
    page: z.string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, 'Page must be greater than 0'),
    limit: z.string()
      .optional()
      .default('10')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
    search: z.string().trim().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    partner: z.string().trim().optional(),
    sortBy: z.enum(['name', 'code', 'createdAt', 'capacity'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc'])
      .optional()
      .default('desc')
  })
});