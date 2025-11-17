import { Types } from 'mongoose';
import { IDispatchOrder, IExpense, IGoodsReceiving, IInventory, IQCTemplate, IReturnOrder, IFieldAgent } from '../models/Warehouse.model';
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
    expiryStatus?: 'expiring_soon' | 'expired' | 'not_expired' | 'no_expiry';
    ageRange?: '0-30' | '31-60' | '61-90' | '90+';
    quantityRange?: 'low' | 'medium' | 'high' | 'out_of_stock';
    archived?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
        type: 'qc_failed' | 'low_stock';
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
export interface GoodsReceivingData {
    poNumber: string;
    vendor: Types.ObjectId;
    sku: string;
    productName: string;
    quantity: number;
    batchId?: string;
    warehouse: Types.ObjectId;
    qcVerification: {
        packaging: boolean;
        expiry: boolean;
        label: boolean;
        documents?: string[];
    };
    storage: {
        zone: string;
        aisle: string;
        rack: string;
        bin: string;
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
    route: string;
    notes?: string;
    estimatedDelivery?: Date;
}
export interface QCTemplateData {
    sku: any | string;
    title: any | string;
    name: string;
    category: 'snacks' | 'beverages' | 'perishable' | 'non_perishable';
    parameters: {
        name: string;
        type: 'boolean' | 'text' | 'number';
        required: boolean;
        options?: string[];
    }[];
}
export interface ReturnOrderData {
    status: string;
    batchId: string;
    sku: string;
    productName: string;
    vendor: Types.ObjectId;
    reason: string;
    quantity: number;
    returnType: 'damaged' | 'expired' | 'wrong_item' | 'overstock' | 'other';
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
    reportType: 'inventory_summary' | 'purchase_orders' | 'inventory_turnover' | 'qc_summary' | 'efficiency' | 'stock_ageing';
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
declare class WarehouseService {
    getDashboard(warehouseId?: string, filters?: any): Promise<DashboardData>;
    private generatePendingVsRefillData;
    private getFilterOptions;
    private getWarehouseInfo;
    private getDateFilter;
    receiveGoods(data: GoodsReceivingData, createdBy: Types.ObjectId): Promise<IGoodsReceiving>;
    getReceivings(warehouseId?: string, filters?: any): Promise<IGoodsReceiving[]>;
    getReceivingById(id: string): Promise<IGoodsReceiving | null>;
    updateQCVerification(id: string, qcData: Partial<GoodsReceivingData['qcVerification']>): Promise<IGoodsReceiving | null>;
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
    getFieldAgents(isActive?: boolean): Promise<IFieldAgent[]>;
    createFieldAgent(data: {
        name: string;
        assignedRoutes: string[];
    }, createdBy: Types.ObjectId): Promise<IFieldAgent>;
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
        category: 'staffing' | 'supplies' | 'equipment' | 'transport';
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
        category?: 'staffing' | 'supplies' | 'equipment' | 'transport';
        amount?: number;
        status?: 'approved' | 'pending';
        date?: Date;
    }): Promise<IExpense>;
    deleteExpense(expenseId: string): Promise<void>;
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
    getStockAgeingReport(_warehouse: any): any;
    generateInventorySummaryReport(filters: any): Promise<InventorySummaryReport>;
    generatePurchaseOrderReport(filters: any): Promise<PurchaseOrderReport>;
    private getRefillMetrics;
    private generateInventoryTurnoverReport;
    private generateQCSummaryReport;
    exportReport(type: string, format: string, filters: any): Promise<any>;
    private convertToCSV;
    private convertInventorySummaryToCSV;
    private convertPurchaseOrdersToCSV;
    private getStockThreshold;
    private extractCategory;
    private convertToPDF;
    private getAgeFilter;
    private generateAlerts;
    private getRecentActivities;
    private validateSkuStock;
    private reduceStockBySku;
    private calculateInventoryStatus;
    private generateEfficiencyReport;
    private calculateOverallEfficiencyScore;
    private convertStockAgeingToCSV;
    private convertInventoryTurnoverToCSV;
    private convertQCSummaryToCSV;
}
export declare const warehouseService: WarehouseService;
export {};
//# sourceMappingURL=warehouse.service.d.ts.map