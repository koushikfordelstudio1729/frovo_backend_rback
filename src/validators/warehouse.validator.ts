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
    vendor: objectIdSchema,
    destination: z.string().min(1, 'Destination is required'),
    products: z.array(z.object({
      sku: z.string().min(1, 'SKU is required'),
      productName: z.string().min(1, 'Product name is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      batchId: z.string().min(1, 'Batch ID is required')
    })).min(1, 'At least one product is required'),
    assignedAgent: objectIdSchema,
    route: z.string().min(1, 'Route is required'),
    notes: z.string().max(500, 'Notes too long').optional()
  })
});

export const createQCTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Template name is required'),
    category: z.enum(['snacks', 'beverages', 'perishable', 'non_perishable']),
    parameters: z.array(z.object({
      name: z.string().min(1, 'Parameter name is required'),
      type: z.enum(['boolean', 'text', 'number']).default('boolean'),
      required: z.boolean().default(true)
    })).min(1, 'At least one parameter is required')
  })
});

export const applyQCTemplateSchema = z.object({
  body: z.object({
    templateId: objectIdSchema,
    batchId: z.string().min(1, 'Batch ID is required')
  })
});

export const createReturnOrderSchema = z.object({
  body: z.object({
    batchId: z.string().min(1, 'Batch ID is required'),
    sku: z.string().min(1, 'SKU is required'),
    vendor: objectIdSchema,
    reason: z.string().min(1, 'Reason is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1')
  })
});

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.enum(['staffing', 'supplies', 'equipment', 'transport']),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    vendor: objectIdSchema.optional(),
    date: z.string().datetime(),
    description: z.string().max(200, 'Description too long').optional(),
    warehouse: objectIdSchema,
    billUrl: z.string().optional()
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