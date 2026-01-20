import { z } from "zod";
export declare const createInventorySchema: z.ZodObject<{
    body: z.ZodObject<{
        sku: z.ZodString;
        productName: z.ZodString;
        po_number: z.ZodString;
        quantity: z.ZodNumber;
        expiry_date: z.ZodOptional<z.ZodString>;
        minStockLevel: z.ZodOptional<z.ZodNumber>;
        maxStockLevel: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sku?: string;
        productName?: string;
        quantity?: number;
        po_number?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiry_date?: string;
    }, {
        sku?: string;
        productName?: string;
        quantity?: number;
        po_number?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiry_date?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        sku?: string;
        productName?: string;
        quantity?: number;
        po_number?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiry_date?: string;
    };
}, {
    body?: {
        sku?: string;
        productName?: string;
        quantity?: number;
        po_number?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiry_date?: string;
    };
}>;
export declare const createPurchaseOrderSchema: z.ZodObject<{
    body: z.ZodObject<{
        vendor: z.ZodString;
        warehouse: z.ZodOptional<z.ZodString>;
        po_raised_date: z.ZodOptional<z.ZodString>;
        po_status: z.ZodDefault<z.ZodEnum<["draft", "approved", "pending"]>>;
        remarks: z.ZodOptional<z.ZodString>;
        po_line_items: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            line_no: z.ZodNumber;
            sku: z.ZodString;
            productName: z.ZodString;
            quantity: z.ZodNumber;
            category: z.ZodString;
            pack_size: z.ZodString;
            uom: z.ZodString;
            unit_price: z.ZodNumber;
            expected_delivery_date: z.ZodString;
            location: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            line_no?: number;
            sku?: string;
            productName?: string;
            quantity?: number;
            category?: string;
            pack_size?: string;
            uom?: string;
            unit_price?: number;
            expected_delivery_date?: string;
            location?: string;
        }, {
            line_no?: number;
            sku?: string;
            productName?: string;
            quantity?: number;
            category?: string;
            pack_size?: string;
            uom?: string;
            unit_price?: number;
            expected_delivery_date?: string;
            location?: string;
        }>, "many">>>;
    }, "strip", z.ZodTypeAny, {
        warehouse?: string;
        remarks?: string;
        vendor?: string;
        po_status?: "draft" | "pending" | "approved";
        po_raised_date?: string;
        po_line_items?: {
            line_no?: number;
            sku?: string;
            productName?: string;
            quantity?: number;
            category?: string;
            pack_size?: string;
            uom?: string;
            unit_price?: number;
            expected_delivery_date?: string;
            location?: string;
        }[];
    }, {
        warehouse?: string;
        remarks?: string;
        vendor?: string;
        po_status?: "draft" | "pending" | "approved";
        po_raised_date?: string;
        po_line_items?: {
            line_no?: number;
            sku?: string;
            productName?: string;
            quantity?: number;
            category?: string;
            pack_size?: string;
            uom?: string;
            unit_price?: number;
            expected_delivery_date?: string;
            location?: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        warehouse?: string;
        remarks?: string;
        vendor?: string;
        po_status?: "draft" | "pending" | "approved";
        po_raised_date?: string;
        po_line_items?: {
            line_no?: number;
            sku?: string;
            productName?: string;
            quantity?: number;
            category?: string;
            pack_size?: string;
            uom?: string;
            unit_price?: number;
            expected_delivery_date?: string;
            location?: string;
        }[];
    };
}, {
    body?: {
        warehouse?: string;
        remarks?: string;
        vendor?: string;
        po_status?: "draft" | "pending" | "approved";
        po_raised_date?: string;
        po_line_items?: {
            line_no?: number;
            sku?: string;
            productName?: string;
            quantity?: number;
            category?: string;
            pack_size?: string;
            uom?: string;
            unit_price?: number;
            expected_delivery_date?: string;
            location?: string;
        }[];
    };
}>;
export declare const createGRNSchema: z.ZodObject<{
    body: z.ZodObject<{
        delivery_challan: z.ZodString;
        transporter_name: z.ZodString;
        vehicle_number: z.ZodString;
        received_date: z.ZodOptional<z.ZodString>;
        remarks: z.ZodOptional<z.ZodString>;
        scanned_challan: z.ZodOptional<z.ZodString>;
        qc_status: z.ZodEnum<["bad", "moderate", "excellent"]>;
        quantities: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, any, string>, z.ZodArray<z.ZodObject<{
            sku: z.ZodString;
            received_quantity: z.ZodNumber;
            accepted_quantity: z.ZodNumber;
            rejected_quantity: z.ZodNumber;
            expiry_date: z.ZodOptional<z.ZodString>;
            item_remarks: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            sku?: string;
            received_quantity?: number;
            accepted_quantity?: number;
            rejected_quantity?: number;
            expiry_date?: string;
            item_remarks?: string;
        }, {
            sku?: string;
            received_quantity?: number;
            accepted_quantity?: number;
            rejected_quantity?: number;
            expiry_date?: string;
            item_remarks?: string;
        }>, "many">]>>;
    }, "strip", z.ZodTypeAny, {
        delivery_challan?: string;
        transporter_name?: string;
        vehicle_number?: string;
        remarks?: string;
        scanned_challan?: string;
        qc_status?: "bad" | "moderate" | "excellent";
        received_date?: string;
        quantities?: any;
    }, {
        delivery_challan?: string;
        transporter_name?: string;
        vehicle_number?: string;
        remarks?: string;
        scanned_challan?: string;
        qc_status?: "bad" | "moderate" | "excellent";
        received_date?: string;
        quantities?: string | {
            sku?: string;
            received_quantity?: number;
            accepted_quantity?: number;
            rejected_quantity?: number;
            expiry_date?: string;
            item_remarks?: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        delivery_challan?: string;
        transporter_name?: string;
        vehicle_number?: string;
        remarks?: string;
        scanned_challan?: string;
        qc_status?: "bad" | "moderate" | "excellent";
        received_date?: string;
        quantities?: any;
    };
}, {
    body?: {
        delivery_challan?: string;
        transporter_name?: string;
        vehicle_number?: string;
        remarks?: string;
        scanned_challan?: string;
        qc_status?: "bad" | "moderate" | "excellent";
        received_date?: string;
        quantities?: string | {
            sku?: string;
            received_quantity?: number;
            accepted_quantity?: number;
            rejected_quantity?: number;
            expiry_date?: string;
            item_remarks?: string;
        }[];
    };
}>;
export declare const updateGRNStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        qc_status: z.ZodEnum<["bad", "moderate", "excellent"]>;
        remarks: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        remarks?: string;
        qc_status?: "bad" | "moderate" | "excellent";
    }, {
        remarks?: string;
        qc_status?: "bad" | "moderate" | "excellent";
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        remarks?: string;
        qc_status?: "bad" | "moderate" | "excellent";
    };
}, {
    body?: {
        remarks?: string;
        qc_status?: "bad" | "moderate" | "excellent";
    };
}>;
export declare const updatePurchaseOrderStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        po_status: z.ZodEnum<["draft", "approved", "delivered"]>;
        remarks: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        remarks?: string;
        po_status?: "draft" | "approved" | "delivered";
    }, {
        remarks?: string;
        po_status?: "draft" | "approved" | "delivered";
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        remarks?: string;
        po_status?: "draft" | "approved" | "delivered";
    };
}, {
    body?: {
        remarks?: string;
        po_status?: "draft" | "approved" | "delivered";
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
            sku?: string;
            quantity?: number;
        }, {
            sku?: string;
            quantity?: number;
        }>, "many">;
        assignedAgent: z.ZodString;
        warehouse: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["pending", "assigned", "in_transit", "delivered", "cancelled"]>>;
    }, "strip", z.ZodTypeAny, {
        warehouse?: string;
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
        dispatchId?: string;
        destination?: string;
        products?: {
            sku?: string;
            quantity?: number;
        }[];
        assignedAgent?: string;
        notes?: string;
    }, {
        warehouse?: string;
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
        dispatchId?: string;
        destination?: string;
        products?: {
            sku?: string;
            quantity?: number;
        }[];
        assignedAgent?: string;
        notes?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        warehouse?: string;
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
        dispatchId?: string;
        destination?: string;
        products?: {
            sku?: string;
            quantity?: number;
        }[];
        assignedAgent?: string;
        notes?: string;
    };
}, {
    body?: {
        warehouse?: string;
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
        dispatchId?: string;
        destination?: string;
        products?: {
            sku?: string;
            quantity?: number;
        }[];
        assignedAgent?: string;
        notes?: string;
    };
}>;
export declare const updateDispatchStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEnum<["pending", "assigned", "in_transit", "delivered", "cancelled"]>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
    }, {
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
    };
}, {
    body?: {
        status?: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";
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
        warehouse: z.ZodOptional<z.ZodString>;
        reason: z.ZodString;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["pending", "approved", "returned", "rejected"]>>>;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        warehouse?: string;
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        vendor?: string;
        quantity?: number;
        batchId?: string;
    }, {
        warehouse?: string;
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        vendor?: string;
        quantity?: number;
        batchId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        warehouse?: string;
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        vendor?: string;
        quantity?: number;
        batchId?: string;
    };
}, {
    body?: {
        warehouse?: string;
        status?: "pending" | "approved" | "rejected" | "returned";
        reason?: string;
        vendor?: string;
        quantity?: number;
        batchId?: string;
    };
}>;
export declare const createFieldAgentSchema: z.ZodObject<{
    body: z.ZodObject<{
        userId: z.ZodString;
        assignedRoutes: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        userId?: string;
        assignedRoutes?: string[];
    }, {
        userId?: string;
        assignedRoutes?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        userId?: string;
        assignedRoutes?: string[];
    };
}, {
    body?: {
        userId?: string;
        assignedRoutes?: string[];
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
        warehouse?: string;
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
    }, {
        warehouse?: string;
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        warehouse?: string;
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
    };
}, {
    query?: {
        warehouse?: string;
        type?: "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
        startDate?: string;
        endDate?: string;
        format?: "csv" | "json";
        category?: string;
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
            documents?: string[];
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        }, {
            documents?: string[];
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        qcVerification?: {
            documents?: string[];
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
    }, {
        qcVerification?: {
            documents?: string[];
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        qcVerification?: {
            documents?: string[];
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
        };
    };
}, {
    body?: {
        qcVerification?: {
            documents?: string[];
            packaging?: boolean;
            expiry?: boolean;
            label?: boolean;
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
        sku?: string;
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    }, {
        sku?: string;
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        sku?: string;
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
        batchId?: string;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: string;
    };
}, {
    body?: {
        sku?: string;
        productName?: string;
        quantity?: number;
        location?: {
            zone?: string;
            aisle?: string;
            rack?: string;
            bin?: string;
        };
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
        vendor?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
        billUrl?: string;
        warehouseId?: string;
    }, {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        vendor?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
        billUrl?: string;
        warehouseId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        vendor?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
        billUrl?: string;
        warehouseId?: string;
    };
}, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        vendor?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
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
        assignedAgent?: string;
        amount?: number;
    }, {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
    };
}, {
    body?: {
        status?: "pending" | "approved";
        date?: string;
        description?: string;
        category?: "staffing" | "supplies" | "equipment" | "transport";
        assignedAgent?: string;
        amount?: number;
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
export declare const createWarehouseSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        code: z.ZodString;
        partner: z.ZodString;
        location: z.ZodString;
        capacity: z.ZodNumber;
        manager: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
    }, {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
    };
}, {
    body?: {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
    };
}>;
export declare const updateWarehouseSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        code: z.ZodOptional<z.ZodString>;
        partner: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        capacity: z.ZodOptional<z.ZodNumber>;
        manager: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
        isActive?: boolean;
    }, {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
        isActive?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
        isActive?: boolean;
    };
}, {
    body?: {
        partner?: string;
        name?: string;
        code?: string;
        location?: string;
        capacity?: number;
        manager?: string;
        isActive?: boolean;
    };
}>;
export declare const getWarehousesQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodEffects<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string>, number, string>;
        limit: z.ZodEffects<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string>, number, string>;
        search: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
        partner: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "code", "createdAt", "capacity"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        partner?: string;
        search?: string;
        limit?: number;
        page?: number;
        sortBy?: "name" | "createdAt" | "code" | "capacity";
        sortOrder?: "asc" | "desc";
        isActive?: "true" | "false";
    }, {
        partner?: string;
        search?: string;
        limit?: string;
        page?: string;
        sortBy?: "name" | "createdAt" | "code" | "capacity";
        sortOrder?: "asc" | "desc";
        isActive?: "true" | "false";
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        partner?: string;
        search?: string;
        limit?: number;
        page?: number;
        sortBy?: "name" | "createdAt" | "code" | "capacity";
        sortOrder?: "asc" | "desc";
        isActive?: "true" | "false";
    };
}, {
    query?: {
        partner?: string;
        search?: string;
        limit?: string;
        page?: string;
        sortBy?: "name" | "createdAt" | "code" | "capacity";
        sortOrder?: "asc" | "desc";
        isActive?: "true" | "false";
    };
}>;
//# sourceMappingURL=warehouse.validator.d.ts.map