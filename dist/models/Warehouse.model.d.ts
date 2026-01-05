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
export interface IGRNnumber extends Document {
    _id: Types.ObjectId;
    delivery_challan: string;
    transporter_name: string;
    vehicle_number: string;
    recieved_date: Date;
    remarks?: string;
    scanned_challan?: string;
    qc_status: 'bad' | 'moderate' | 'excellent';
    purchase_order: Types.ObjectId;
    vendor: Types.ObjectId;
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
    grn_line_items: Array<{
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
        received_quantity?: number;
        accepted_quantity?: number;
        rejected_quantity?: number;
    }>;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GRNnumber: mongoose.Model<IGRNnumber, {}, {}, {}, mongoose.Document<unknown, {}, IGRNnumber, {}, {}> & IGRNnumber & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IRaisePurchaseOrder extends Document {
    _id: Types.ObjectId;
    po_number: string;
    vendor: Types.ObjectId;
    warehouse: Types.ObjectId;
    po_status: 'draft' | 'approved' | 'pending';
    po_raised_date: Date;
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
        images?: Array<{
            file_name: string;
            file_url: string;
            cloudinary_public_id: string;
            file_size: number;
            mime_type: string;
            uploaded_at: Date;
        }>;
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
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    generatePONumber(): Promise<string>;
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
    warehouse: Types.ObjectId;
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
    warehouse: Types.ObjectId;
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
    userId?: Types.ObjectId;
    name: string;
    email?: string;
    phone?: string;
    assignedRoutes: string[];
    assignedWarehouse?: Types.ObjectId;
    assignedArea?: Types.ObjectId;
    isActive: boolean;
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
export declare const RaisePurchaseOrder: mongoose.Model<IRaisePurchaseOrder, {}, {}, {}, mongoose.Document<unknown, {}, IRaisePurchaseOrder, {}, {}> & IRaisePurchaseOrder & Required<{
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