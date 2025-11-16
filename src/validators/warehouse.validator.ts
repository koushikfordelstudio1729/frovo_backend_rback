// validators/warehouse.validator.ts
import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const receiveGoodsSchema = z.object({
  body: z.object({
    poNumber: z.string().min(1, 'PO Number is required'),
    vendor: objectIdSchema,
    sku: z.string().min(1, 'SKU is required'),
    productName: z.string().min(1, 'Product name is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    batchId: z.string().min(1, 'Batch ID is required').optional(),
    warehouse: objectIdSchema,
    qcVerification: z.object({
      packaging: z.boolean(),
      expiry: z.boolean(),
      label: z.boolean()
    }),
    storage: z.object({
      zone: z.string().min(1, 'Zone is required'),
      aisle: z.string().min(1, 'Aisle is required'),
      rack: z.string().min(1, 'Rack is required'),
      bin: z.string().min(1, 'Bin is required')
    }),
    documents: z.array(z.string()).optional()
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
    reason: z.string().min(1, 'Reason is required'),
    status: z.enum(['pending', 'approved', 'returned', 'rejected']).optional().default('pending'),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional().default(1),
    // Remove required fields: sku, productName, returnType
    // They will be auto-populated
  })
});

export const createFieldAgentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(1, 'Phone is required'),
    vehicleType: z.string().min(1, 'Vehicle type is required'),
    licensePlate: z.string().min(1, 'License plate is required'),
    assignedRoutes: z.array(z.string()).optional()
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