import { z } from 'zod';
export declare const receiveGoodsSchema: z.ZodObject<{
    body: z.ZodObject<{
        poNumber: z.ZodString;
        vendor: z.ZodString;
        sku: z.ZodString;
        productName: z.ZodString;
        quantity: z.ZodNumber;
        batchId: z.ZodOptional<z.ZodString>;
        warehouse: z.ZodString;
        qcVerification: z.ZodObject<{
            packaging: z.ZodBoolean;
            expiry: z.ZodBoolean;
            label: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        }, {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        }>;
        storage: z.ZodObject<{
            zone: z.ZodString;
            aisle: z.ZodString;
            rack: z.ZodString;
            bin: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        }, {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        }>;
        documents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        productName?: string;
        quantity?: number;
        poNumber?: string;
        vendor?: string;
        sku?: string;
        batchId?: string;
        warehouse?: string;
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
        storage?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        documents?: string[];
    }, {
        productName?: string;
        quantity?: number;
        poNumber?: string;
        vendor?: string;
        sku?: string;
        batchId?: string;
        warehouse?: string;
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
        storage?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        documents?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        productName?: string;
        quantity?: number;
        poNumber?: string;
        vendor?: string;
        sku?: string;
        batchId?: string;
        warehouse?: string;
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
        storage?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        documents?: string[];
    };
}, {
    body?: {
        productName?: string;
        quantity?: number;
        poNumber?: string;
        vendor?: string;
        sku?: string;
        batchId?: string;
        warehouse?: string;
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
        storage?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        documents?: string[];
    };
}>;
export declare const createDispatchSchema: z.ZodObject<{
    body: z.ZodObject<{
        dispatchId: z.ZodString;
        destination: z.ZodString;
        products: z.ZodArray<z.ZodObject<{
            sku: z.ZodString;
            quantity: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            quantity?: number;
            sku?: string;
        }, {
            quantity?: number;
            sku?: string;
        }>, "many">;
        assignedAgent: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["pending", "assigned", "in_transit", "delivered", "cancelled"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
        notes?: string;
        products?: {
            quantity?: number;
            sku?: string;
        }[];
        dispatchId?: string;
        destination?: string;
        assignedAgent?: string;
    }, {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
        notes?: string;
        products?: {
            quantity?: number;
            sku?: string;
        }[];
        dispatchId?: string;
        destination?: string;
        assignedAgent?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
        notes?: string;
        products?: {
            quantity?: number;
            sku?: string;
        }[];
        dispatchId?: string;
        destination?: string;
        assignedAgent?: string;
    };
}, {
    body?: {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
        notes?: string;
        products?: {
            quantity?: number;
            sku?: string;
        }[];
        dispatchId?: string;
        destination?: string;
        assignedAgent?: string;
    };
}>;
export declare const updateDispatchStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<["pending", "assigned", "in_transit", "delivered", "cancelled"]>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
    }, {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
    };
}, {
    body?: {
        status?: "pending" | "cancelled" | "assigned" | "in_transit" | "delivered";
    };
}>;
export declare const createQCTemplateSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        sku: z.ZodString;
        parameters: z.ZodEffects<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name?: string;
            value?: string;
        }, {
            name?: string;
            value?: string;
        }>, "many">, {
            name?: string;
            value?: string;
        }[], {
            name?: string;
            value?: string;
        }[]>;
    }, "strip", z.ZodTypeAny, {
        sku?: string;
        title?: string;
        parameters?: {
            name?: string;
            value?: string;
        }[];
    }, {
        sku?: string;
        title?: string;
        parameters?: {
            name?: string;
            value?: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        sku?: string;
        title?: string;
        parameters?: {
            name?: string;
            value?: string;
        }[];
    };
}, {
    body?: {
        sku?: string;
        title?: string;
        parameters?: {
            name?: string;
            value?: string;
        }[];
    };
}>;
export declare const applyQCTemplateSchema: z.ZodObject<{
    body: z.ZodObject<{
        templateId: z.ZodString;
        batchId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        batchId?: string;
        templateId?: string;
    }, {
        batchId?: string;
        templateId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        batchId?: string;
        templateId?: string;
    };
}, {
    body?: {
        batchId?: string;
        templateId?: string;
    };
}>;
export declare const createReturnOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        batchId: z.ZodString;
        vendor: z.ZodString;
        reason: z.ZodString;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["pending", "approved", "returned", "rejected"]>>>;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        quantity?: number;
        vendor?: string;
        batchId?: string;
    }, {
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        quantity?: number;
        vendor?: string;
        batchId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        quantity?: number;
        vendor?: string;
        batchId?: string;
    };
}, {
    body?: {
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        quantity?: number;
        vendor?: string;
        batchId?: string;
    };
}>;
export declare const createFieldAgentSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        assignedRoutes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        assignedRoutes?: string;
    }, {
        name?: string;
        assignedRoutes?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        name?: string;
        assignedRoutes?: string;
    };
}, {
    body?: {
        name?: string;
        assignedRoutes?: string;
    };
}>;
export declare const warehouseReportSchema: z.ZodObject<{
    query: z.ZodObject<{
        type: z.ZodEnum<["inventory_turnover", "qc_summary", "efficiency", "stock_ageing"]>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        warehouse: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        format: z.ZodDefault<z.ZodEnum<["json", "csv"]>>;
    }, "strip", z.ZodTypeAny, {
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
        warehouse?: string;
    }, {
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
        warehouse?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
        warehouse?: string;
    };
}, {
    query?: {
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
        warehouse?: string;
    };
}>;
export declare const updateQCSchema: z.ZodObject<{
    body: z.ZodObject<{
        qcVerification: z.ZodObject<{
            packaging: z.ZodOptional<z.ZodBoolean>;
            expiry: z.ZodOptional<z.ZodBoolean>;
            label: z.ZodOptional<z.ZodBoolean>;
            documents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
            documents?: string[];
        }, {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
            documents?: string[];
        }>;
    }, "strip", z.ZodTypeAny, {
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
            documents?: string[];
        };
    }, {
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
            documents?: string[];
        };
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
            documents?: string[];
        };
    };
}, {
    body?: {
        qcVerification?: {
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
            documents?: string[];
        };
    };
}>;
export declare const updateInventorySchema: z.ZodObject<{
    body: z.ZodObject<{
        sku: z.ZodOptional<z.ZodString>;
        productName: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        quantity: z.ZodOptional<z.ZodNumber>;
        expiryDate: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodObject<{
            zone: z.ZodOptional<z.ZodString>;
            aisle: z.ZodOptional<z.ZodString>;
            rack: z.ZodOptional<z.ZodString>;
            bin: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        }, {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        }>>;
        minStockLevel: z.ZodOptional<z.ZodNumber>;
        maxStockLevel: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        sku?: string;
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    }, {
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        sku?: string;
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        sku?: string;
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    };
}, {
    body?: {
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        sku?: string;
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    };
}>;
export declare const createExpenseSchema: z.ZodObject<{
    body: z.ZodObject<{
        category: z.ZodEnum<["staffing", "supplies", "equipment", "transport"]>;
        amount: z.ZodNumber;
        vendor: z.ZodString;
        date: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        billUrl: z.ZodOptional<z.ZodString>;
        assignedAgent: z.ZodString;
        warehouseId: z.ZodString;
        status: z.ZodOptional<z.ZodEnum<["approved", "pending"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        vendor?: string;
        assignedAgent?: string;
        billUrl?: string;
        warehouseId?: string;
    }, {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        vendor?: string;
        assignedAgent?: string;
        billUrl?: string;
        warehouseId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        vendor?: string;
        assignedAgent?: string;
        billUrl?: string;
        warehouseId?: string;
    };
}, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        vendor?: string;
        assignedAgent?: string;
        billUrl?: string;
        warehouseId?: string;
    };
}>;
export declare const updateExpenseSchema: z.ZodObject<{
    body: z.ZodObject<{
        category: z.ZodOptional<z.ZodEnum<["staffing", "supplies", "equipment", "transport"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        date: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["approved", "pending"]>>;
        assignedAgent: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        assignedAgent?: string;
    }, {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        assignedAgent?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        assignedAgent?: string;
    };
}, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        assignedAgent?: string;
    };
}>;
export declare const updateExpenseStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<["approved", "pending", "rejected"]>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "approved" | "rejected";
    }, {
        status?: "pending" | "approved" | "rejected";
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "approved" | "rejected";
    };
}, {
    body?: {
        status?: "pending" | "approved" | "rejected";
    };
}>;
export declare const updateExpensePaymentStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        paymentStatus: z.ZodEnum<["paid", "unpaid", "partially_paid"]>;
    }, "strip", z.ZodTypeAny, {
        paymentStatus?: "paid" | "unpaid" | "partially_paid";
    }, {
        paymentStatus?: "paid" | "unpaid" | "partially_paid";
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        paymentStatus?: "paid" | "unpaid" | "partially_paid";
    };
}, {
    body?: {
        paymentStatus?: "paid" | "unpaid" | "partially_paid";
    };
}>;
export declare const dashboardQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        date: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        partner: z.ZodOptional<z.ZodString>;
        warehouseId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        partner?: string;
        date?: string;
        category?: string;
        warehouseId?: string;
    }, {
        partner?: string;
        date?: string;
        category?: string;
        warehouseId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        partner?: string;
        date?: string;
        category?: string;
        warehouseId?: string;
    };
}, {
    query?: {
        partner?: string;
        date?: string;
        category?: string;
        warehouseId?: string;
    };
}>;
//# sourceMappingURL=warehouse.validator.d.ts.map