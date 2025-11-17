import mongoose, { Document, Types } from 'mongoose';
export interface IWarehouse extends Document {
    _id: Types.ObjectId;
    name: string;
    code: string;
    partner: string;
    location: string;
    capacity: number;
    manager: Types.ObjectId;
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IGoodsReceiving extends Document {
    _id: Types.ObjectId;
    poNumber: string;
    vendor: Types.ObjectId;
    sku: string;
    productName: string;
    quantity: number;
    batchId: string;
    warehouse: Types.ObjectId;
    qcVerification: {
        packaging: boolean;
        expiry: boolean;
        label: boolean;
        documents: string[];
    };
    storage: {
        zone: string;
        aisle: string;
        rack: string;
        bin: string;
    };
    status: 'received' | 'qc_pending' | 'qc_passed' | 'qc_failed';
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IDispatchOrder extends Document {
    _id: Types.ObjectId;
    dispatchId: string;
    destination: string;
    products: {
        sku: string;
        quantity: number;
    }[];
    assignedAgent: Types.ObjectId;
    notes?: string;
    status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IQCTemplate extends Document {
    _id: Types.ObjectId;
    title: string;
    sku: string;
    parameters: {
        name: string;
        value: string;
    }[];
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IReturnOrder extends Document {
    _id: Types.ObjectId;
    batchId: string;
    vendor: Types.ObjectId;
    reason: string;
    quantity: number;
    status: 'pending' | 'approved' | 'returned' | 'rejected';
    returnType: 'damaged' | 'expired' | 'wrong_item' | 'overstock' | 'other';
    images?: string[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IFieldAgent extends Document {
    _id: Types.ObjectId;
    name: string;
    assignedRoutes: string[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IInventory extends Document {
    _id: Types.ObjectId;
    sku: string;
    productName: string;
    batchId: string;
    warehouse: Types.ObjectId;
    quantity: number;
    minStockLevel: number;
    maxStockLevel: number;
    age: number;
    expiryDate?: Date;
    location: {
        zone: string;
        aisle: string;
        rack: string;
        bin: string;
    };
    status: 'active' | 'low_stock' | 'overstock' | 'expired' | 'quarantine' | 'archived';
    isArchived: boolean;
    archivedAt?: Date;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export interface IExpense extends Document {
    _id: Types.ObjectId;
    category: 'staffing' | 'supplies' | 'equipment' | 'transport';
    amount: number;
    vendor: Types.ObjectId;
    date: Date;
    description?: string;
    billUrl?: string;
    status: 'approved' | 'pending';
    assignedAgent: Types.ObjectId;
    warehouseId: Types.ObjectId;
    paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
    createdBy: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Warehouse: mongoose.Model<IWarehouse, {}, {}, {}, mongoose.Document<unknown, {}, IWarehouse, {}, {}> & IWarehouse & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const GoodsReceiving: mongoose.Model<IGoodsReceiving, {}, {}, {}, mongoose.Document<unknown, {}, IGoodsReceiving, {}, {}> & IGoodsReceiving & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const DispatchOrder: mongoose.Model<IDispatchOrder, {}, {}, {}, mongoose.Document<unknown, {}, IDispatchOrder, {}, {}> & IDispatchOrder & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const QCTemplate: mongoose.Model<IQCTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IQCTemplate, {}, {}> & IQCTemplate & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const ReturnOrder: mongoose.Model<IReturnOrder, {}, {}, {}, mongoose.Document<unknown, {}, IReturnOrder, {}, {}> & IReturnOrder & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Inventory: mongoose.Model<IInventory, {}, {}, {}, mongoose.Document<unknown, {}, IInventory, {}, {}> & IInventory & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Expense: mongoose.Model<IExpense, {}, {}, {}, mongoose.Document<unknown, {}, IExpense, {}, {}> & IExpense & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const FieldAgent: mongoose.Model<IFieldAgent, {}, {}, {}, mongoose.Document<unknown, {}, IFieldAgent, {}, {}> & IFieldAgent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Warehouse.model.d.ts.map