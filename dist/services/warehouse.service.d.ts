import mongoose from "mongoose";
import { Types } from "mongoose";
import { IDispatchOrder, IExpense, IRaisePurchaseOrder, IInventory, IQCTemplate, IReturnOrder, IGRNnumber } from "../models/Warehouse.model";
export interface InventoryStats {
    totalItems: number;
    activeItems: number;
    archivedItems: number;
    lowStockItems: number;
    expiredItems: number;
    nearExpiryItems: number;
    totalStockValue: number;
    statusBreakdown: {
        [key: string]: number;
    };
}
export interface InventoryDashboardFilters {
    status?: string;
    sku?: string;
    batchId?: string;
    productName?: string;
    expiryStatus?: "expiring_soon" | "expired" | "not_expired" | "no_expiry";
    ageRange?: "0-30" | "31-60" | "61-90" | "90+";
    quantityRange?: "low" | "medium" | "high" | "out_of_stock";
    archived?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
export interface InventoryDashboardResponse {
    inventory: IInventory[];
    total: number;
    page: number;
    totalPages: number;
    filters: InventoryDashboardFilters;
}
export interface DashboardData {
    kpis: {
        inbound: number;
        outbound: number;
        pendingQC: number;
        todayDispatches: number;
    };
    alerts: {
        type: "qc_failed" | "low_stock";
        message: string;
        count: number;
    }[];
    recentActivities: any[];
    pendingVsRefill: {
        days: string[];
        pendingPercentages: number[];
        refillPercentages: number[];
    };
    filters: {
        categories: string[];
        partners: string[];
    };
    warehouseInfo: {
        name: string;
        pendingBatches: number;
    };
}
export interface RaisePurchaseOrderData {
    po_number?: string;
    vendor: Types.ObjectId;
    warehouse: string;
    po_raised_date: Date;
    po_status: "pending" | "approved" | "draft";
    vendor_id: string;
    vendor_address: string;
    vendor_contact: string;
    vendor_email: string;
    vendor_phone: string;
    gst_number: string;
    remarks?: string;
    po_line_items: Array<{
        line_no: number;
        sku: string;
        productName: string;
        quantity: number;
        category: string;
        pack_size: string;
        uom: string;
        unit_price: number;
        expected_delivery_date: Date;
        location: string;
    }>;
    vendor_details: {
        vendor_name: string;
        vendor_billing_name: string;
        vendor_email: string;
        vendor_phone: string;
        vendor_category: string;
        gst_number: string;
        verification_status: string;
        vendor_address: string;
        vendor_contact: string;
        vendor_id: string;
    };
}
export interface DispatchData {
    vendor: Types.ObjectId;
    destination: string;
    products: {
        sku: string;
        productName: string;
        quantity: number;
        batchId: string;
        unitPrice?: number;
    }[];
    assignedAgent: Types.ObjectId;
    warehouse: Types.ObjectId;
    route: string;
    notes?: string;
    estimatedDelivery?: Date;
}
export interface QCTemplateData {
    title: string;
    sku: string;
    parameters: {
        name: string;
        value: string;
    }[];
}
export interface ReturnOrderData {
    status: string;
    batchId: string;
    sku: string;
    productName: string;
    vendor: Types.ObjectId;
    warehouse: Types.ObjectId;
    reason: string;
    quantity: number;
    returnType: "damaged" | "expired" | "wrong_item" | "overstock" | "other";
    images?: string[];
}
export interface InventoryUpsertData {
    sku: string;
    productName: string;
    batchId: string;
    warehouse: Types.ObjectId;
    quantity: number;
    location: {
        zone: string;
        aisle: string;
        rack: string;
        bin: string;
    };
    createdBy: Types.ObjectId;
}
export interface ReportFilters {
    reportType: "inventory_summary" | "purchase_orders" | "inventory_turnover" | "qc_summary" | "efficiency" | "stock_ageing";
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
    warehouse?: string;
    category?: string;
    vendor?: string;
    status?: string;
    sku?: string;
}
export interface InventorySummaryReport {
    summary: {
        totalSKUs: number;
        stockOutSKUs: number;
        totalPOs: number;
        pendingPOs: number;
        pendingRefills: number;
        completedRefills: number;
        totalStockValue: number;
        lowStockItems: number;
        nearExpirySKUs: number;
        stockAccuracy: number;
    };
    inventoryDetails: IInventory[];
    generatedOn: Date;
    filters: ReportFilters;
}
export interface PurchaseOrderReport {
    summary: {
        totalPOs: number;
        pendingPOs: number;
        approvedPOs: number;
        rejectedPOs: number;
        totalPOValue: number;
        averagePOValue: number;
    };
    purchaseOrders: any[];
    generatedOn: Date;
    filters: ReportFilters;
}
export interface GRNData {
    delivery_challan: string;
    transporter_name: string;
    vehicle_number: string;
    recieved_date: Date;
    remarks?: string;
    scanned_challan?: string;
    qc_status: "bad" | "moderate" | "excellent";
    quantities?: Array<{
        sku: string;
        received_quantity: number;
        accepted_quantity: number;
        rejected_quantity: number;
        expiry_date?: string;
        item_remarks?: string;
    }>;
}
declare class WarehouseService {
    private documentUploadService;
    constructor();
    getDashboard(warehouseId?: string, filters?: any): Promise<DashboardData>;
    private generatePendingVsRefillData;
    private getFilterOptions;
    private getWarehouseInfo;
    private getDateFilter;
    createPurchaseOrder(data: RaisePurchaseOrderData, createdBy: Types.ObjectId): Promise<IRaisePurchaseOrder>;
    createGRN(purchaseOrderId: string, grnData: GRNData, createdBy: Types.ObjectId, uploadedFile?: Express.Multer.File): Promise<IGRNnumber>;
    private generateGRNNumber;
    deletePurchaseOrder(id: string): Promise<void>;
    getGRNById(grnId: string): Promise<IGRNnumber | null>;
    getGRNs(filters?: {
        qc_status?: "bad" | "moderate" | "excellent";
        transporter_name?: string;
        startDate?: string;
        endDate?: string;
        vendor?: string;
        purchase_order?: string;
    }): Promise<IGRNnumber[]>;
    updateGRNStatus(grnId: string, qc_status: "bad" | "moderate" | "excellent", remarks?: string, lineItems?: Array<{
        line_no: number;
        received_quantity: number;
        accepted_quantity: number;
        rejected_quantity: number;
    }>): Promise<IGRNnumber>;
    updateGRNLineItems(grnId: string, lineItems: Array<{
        line_no: number;
        received_quantity: number;
        accepted_quantity: number;
        rejected_quantity: number;
    }>): Promise<IGRNnumber>;
    getPurchaseOrders(warehouseId?: string, filters?: any): Promise<IRaisePurchaseOrder[]>;
    getPurchaseOrderById(id: string): Promise<IRaisePurchaseOrder | null>;
    updatePurchaseOrderStatus(id: string, po_status: "draft" | "approved" | "pending", remarks?: string): Promise<IRaisePurchaseOrder | null>;
    upsertInventory(data: InventoryUpsertData): Promise<void>;
    createDispatch(data: DispatchData, createdBy: Types.ObjectId): Promise<IDispatchOrder>;
    getDispatches(warehouseId?: string, filters?: any): Promise<IDispatchOrder[]>;
    updateDispatchStatus(dispatchId: string, status: string): Promise<IDispatchOrder>;
    getDispatchById(dispatchId: string): Promise<IDispatchOrder | null>;
    createQCTemplate(data: QCTemplateData, createdBy: Types.ObjectId): Promise<IQCTemplate>;
    getQCTemplates(sku?: string): Promise<IQCTemplate[]>;
    updateQCTemplate(templateId: string, updateData: Partial<QCTemplateData>): Promise<IQCTemplate | null>;
    deleteQCTemplate(templateId: string): Promise<void>;
    createReturnOrder(data: ReturnOrderData, createdBy: Types.ObjectId): Promise<IReturnOrder>;
    private determineReturnType;
    getReturnQueue(warehouseId?: string, filters?: any): Promise<IReturnOrder[]>;
    approveReturn(returnId: string): Promise<IReturnOrder>;
    rejectReturn(returnId: string): Promise<IReturnOrder>;
    getFieldAgents(isActive?: boolean): Promise<any[]>;
    updateFieldAgent(userId: string, data: {
        name?: string;
        assignedRoutes?: string[];
        assignedWarehouse?: Types.ObjectId;
        assignedArea?: Types.ObjectId;
    }): Promise<any>;
    createFieldAgent(data: {
        userId: string;
        assignedRoutes?: string[];
    }, createdBy: Types.ObjectId): Promise<any>;
    getInventoryDashboard(warehouseId: string, filters?: InventoryDashboardFilters, page?: number, limit?: number): Promise<InventoryDashboardResponse>;
    getInventoryById(inventoryId: string): Promise<IInventory | null>;
    updateInventoryItem(inventoryId: string, updateData: {
        sku?: string;
        productName?: string;
        batchId?: string;
        quantity?: number;
        minStockLevel?: number;
        maxStockLevel?: number;
        expiryDate?: Date | string;
        location?: {
            zone: string;
            aisle: string;
            rack: string;
            bin: string;
        };
    }): Promise<IInventory>;
    archiveInventoryItem(inventoryId: string): Promise<IInventory>;
    unarchiveInventoryItem(inventoryId: string): Promise<IInventory>;
    getInventoryStats(warehouseId: string): Promise<InventoryStats>;
    bulkArchiveInventory(inventoryIds: string[]): Promise<{
        success: boolean;
        message: string;
        archivedCount: number;
        failedCount: number;
        failedIds: string[];
    }>;
    bulkUnarchiveInventory(inventoryIds: string[]): Promise<{
        success: boolean;
        message: string;
        unarchivedCount: number;
        failedCount: number;
        failedIds: string[];
    }>;
    getArchivedInventory(warehouseId: string, page?: number, limit?: number): Promise<{
        inventory: IInventory[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    createExpense(data: {
        category: "staffing" | "supplies" | "equipment" | "transport";
        amount: number;
        vendor?: Types.ObjectId;
        date: Date;
        description?: string;
        warehouseId: Types.ObjectId;
        billUrl?: string;
    }, createdBy: Types.ObjectId): Promise<IExpense>;
    getExpenses(warehouseId?: string, filters?: any): Promise<IExpense[]>;
    updateExpenseStatus(expenseId: string, status: string, approvedBy?: Types.ObjectId): Promise<IExpense>;
    updateExpensePaymentStatus(expenseId: string, paymentStatus: string): Promise<IExpense>;
    updateExpense(expenseId: string, updateData: {
        category?: "staffing" | "supplies" | "equipment" | "transport";
        amount?: number;
        status?: "approved" | "pending";
        date?: Date;
    }): Promise<IExpense>;
    deleteExpense(expenseId: string): Promise<void>;
    uploadExpenseBill(expenseId: string, file: Express.Multer.File): Promise<IExpense>;
    getExpenseById(expenseId: string): Promise<IExpense | null>;
    getExpenseSummary(warehouseId: string, filters?: any): Promise<{
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        byCategory: {
            [key: string]: number;
        };
        byMonth: {
            [key: string]: number;
        };
        paymentSummary: {
            paid: number;
            unpaid: number;
            partially_paid: number;
        };
    }>;
    getMonthlyExpenseTrend(warehouseId: string, months?: number): Promise<any[]>;
    generateReport(type: string, filters: any): Promise<any>;
    private getStockAgeingReport;
    private generateInventorySummaryReport;
    private generatePurchaseOrderReport;
    private getRefillMetrics;
    private generateInventoryTurnoverReport;
    private generateQCSummaryReport;
    private generateEfficiencyReport;
    private calculateOverallEfficiencyScore;
    exportReport(type: string, format: string, filters: any): Promise<any>;
    private convertToCSV;
    private convertInventorySummaryToCSV;
    private convertPurchaseOrdersToCSV;
    private convertStockAgeingToCSV;
    private convertInventoryTurnoverToCSV;
    private convertQCSummaryToCSV;
    private getStockThreshold;
    private extractCategory;
    private convertToPDF;
    private getAgeFilter;
    private generateAlerts;
    private getRecentActivities;
    private validateSkuStock;
    private reduceStockBySku;
    private calculateInventoryStatus;
    createWarehouse(data: {
        name: string;
        code: string;
        partner: string;
        location: string;
        capacity: number;
        manager: Types.ObjectId;
    }, createdBy: Types.ObjectId): Promise<mongoose.Document<unknown, {}, import("../models/Warehouse.model").IWarehouse, {}, {}> & import("../models/Warehouse.model").IWarehouse & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getWarehouses(filters: {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
        partner?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }, userId: Types.ObjectId, userRoles: any[]): Promise<{
        warehouses: (mongoose.Document<unknown, {}, import("../models/Warehouse.model").IWarehouse, {}, {}> & import("../models/Warehouse.model").IWarehouse & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getWarehouseById(warehouseId: string, userId: Types.ObjectId, userRoles: any[]): Promise<mongoose.Document<unknown, {}, import("../models/Warehouse.model").IWarehouse, {}, {}> & import("../models/Warehouse.model").IWarehouse & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateWarehouse(warehouseId: string, updateData: Partial<{
        name: string;
        code: string;
        partner: string;
        location: string;
        capacity: number;
        manager: Types.ObjectId;
        isActive: boolean;
    }>): Promise<mongoose.Document<unknown, {}, import("../models/Warehouse.model").IWarehouse, {}, {}> & import("../models/Warehouse.model").IWarehouse & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    deleteWarehouse(warehouseId: string): Promise<{
        message: string;
        warehouse: mongoose.Document<unknown, {}, import("../models/Warehouse.model").IWarehouse, {}, {}> & import("../models/Warehouse.model").IWarehouse & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    getMyWarehouse(managerId: Types.ObjectId | string): Promise<mongoose.FlattenMaps<import("../models/Warehouse.model").IWarehouse> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export declare const warehouseService: WarehouseService;
export {};
//# sourceMappingURL=warehouse.service.d.ts.map