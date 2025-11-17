"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseService = void 0;
const Warehouse_model_1 = require("../models/Warehouse.model");
const mongoose_1 = require("mongoose");
class WarehouseService {
    async getDashboard(warehouseId, filters) {
        const dateFilter = this.getDateFilter(filters?.dateRange);
        const baseQuery = {};
        if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            baseQuery.warehouse = new mongoose_1.Types.ObjectId(warehouseId);
        }
        if (filters?.category) {
            baseQuery.productName = { $regex: filters.category, $options: 'i' };
        }
        const [inbound, outbound, pendingQC, todayDispatches] = await Promise.all([
            Warehouse_model_1.GoodsReceiving.countDocuments({
                ...baseQuery,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            }),
            Warehouse_model_1.DispatchOrder.countDocuments({
                ...baseQuery,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
            }),
            Warehouse_model_1.GoodsReceiving.countDocuments({
                ...baseQuery,
                status: 'qc_pending'
            }),
            Warehouse_model_1.DispatchOrder.countDocuments({
                ...baseQuery,
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999))
                }
            })
        ]);
        const alerts = await this.generateAlerts(warehouseId);
        const recentActivities = await this.getRecentActivities(warehouseId);
        const pendingVsRefill = await this.generatePendingVsRefillData(warehouseId, filters);
        const filterOptions = await this.getFilterOptions();
        const warehouseInfo = await this.getWarehouseInfo(warehouseId);
        return {
            kpis: { inbound, outbound, pendingQC, todayDispatches },
            alerts,
            recentActivities,
            pendingVsRefill,
            filters: filterOptions,
            warehouseInfo
        };
    }
    async generatePendingVsRefillData(_warehouseId, _filters) {
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const pendingPercentages = [100, 90, 60, 40, 20, 50, 70];
        const refillPercentages = [80, 70, 90, 60, 40, 85, 95];
        return {
            days,
            pendingPercentages,
            refillPercentages
        };
    }
    async getFilterOptions() {
        try {
            const categories = await Warehouse_model_1.GoodsReceiving.aggregate([
                {
                    $match: {
                        productName: { $exists: true, $ne: '' }
                    }
                },
                {
                    $group: {
                        _id: { $toLower: "$productName" }
                    }
                },
                {
                    $project: {
                        name: "$_id",
                        _id: 0
                    }
                },
                { $limit: 10 }
            ]);
            const categoryNames = categories.map((cat) => cat.name.charAt(0).toUpperCase() + cat.name.slice(1)).filter((name) => name.length > 0);
            const partners = await Warehouse_model_1.GoodsReceiving.aggregate([
                {
                    $lookup: {
                        from: 'vendors',
                        localField: 'vendor',
                        foreignField: '_id',
                        as: 'vendorData'
                    }
                },
                {
                    $unwind: {
                        path: '$vendorData',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: '$vendor',
                        vendorName: { $first: '$vendorData.name' }
                    }
                },
                {
                    $match: {
                        vendorName: { $exists: true, $ne: null }
                    }
                },
                {
                    $project: {
                        name: '$vendorName',
                        _id: 0
                    }
                },
                { $limit: 10 }
            ]);
            const partnerNames = partners.map((p) => p.name).filter(Boolean);
            return {
                categories: categoryNames.length > 0 ? categoryNames : ['Snacks', 'Beverages', 'Perishable', 'Non-Perishable'],
                partners: partnerNames.length > 0 ? partnerNames : ['XYZ Warehouse', 'ABC Suppliers', 'Global Foods']
            };
        }
        catch (error) {
            console.error('Error getting filter options:', error);
            return {
                categories: ['Snacks', 'Beverages', 'Perishable', 'Non-Perishable'],
                partners: ['XYZ Warehouse', 'ABC Suppliers', 'Global Foods']
            };
        }
    }
    async getWarehouseInfo(warehouseId) {
        try {
            const pendingBatches = await Warehouse_model_1.GoodsReceiving.countDocuments({
                ...(warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId) && {
                    warehouse: new mongoose_1.Types.ObjectId(warehouseId)
                }),
                status: 'qc_pending'
            });
            return {
                name: 'XYZ WAREHOUSE',
                pendingBatches
            };
        }
        catch (error) {
            console.error('Error getting warehouse info:', error);
            return {
                name: 'XYZ WAREHOUSE',
                pendingBatches: 3
            };
        }
    }
    getDateFilter(dateRange) {
        if (!dateRange)
            return {};
        if (typeof dateRange === 'string' && dateRange.includes('-')) {
            try {
                const parts = dateRange.split('-');
                const [dayStr, monthStr, yearStr] = parts;
                const day = dayStr ? Number(dayStr) : NaN;
                const month = monthStr ? Number(monthStr) : NaN;
                const year = yearStr ? Number(yearStr) : NaN;
                if (![day, month, year].every(n => Number.isInteger(n) && !Number.isNaN(n))) {
                    throw new Error(`Invalid custom date format: ${dateRange}`);
                }
                const customDate = new Date(year, month - 1, day);
                const startOfDay = new Date(customDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(customDate);
                endOfDay.setHours(23, 59, 59, 999);
                return {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            }
            catch (error) {
                console.error('Error parsing custom date:', error);
                return {};
            }
        }
        const now = new Date();
        switch (dateRange) {
            case 'today':
                return {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date(now.setHours(23, 59, 59, 999))
                };
            case 'this_week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return {
                    $gte: startOfWeek,
                    $lte: endOfWeek
                };
            case 'this_month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                return {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                };
            default:
                return {};
        }
    }
    async receiveGoods(data, createdBy) {
        const batchId = data.batchId || `BATCH-${Date.now()}`;
        const qcPassed = data.qcVerification.packaging &&
            data.qcVerification.expiry &&
            data.qcVerification.label;
        const status = qcPassed ? 'qc_passed' : 'qc_failed';
        const goodsReceiving = await Warehouse_model_1.GoodsReceiving.create({
            ...data,
            batchId,
            status,
            createdBy
        });
        if (status === 'qc_passed') {
            await this.upsertInventory({
                sku: data.sku,
                productName: data.productName,
                batchId,
                warehouse: data.warehouse,
                quantity: data.quantity,
                location: data.storage,
                createdBy
            });
        }
        return goodsReceiving;
    }
    async getReceivings(warehouseId, filters) {
        let query = {};
        if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            query.warehouseId = new mongoose_1.Types.ObjectId(warehouseId);
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate)
                query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate)
                query.createdAt.$lte = new Date(filters.endDate);
        }
        if (filters?.status)
            query.status = filters.status;
        if (filters?.poNumber)
            query.poNumber = { $regex: filters.poNumber, $options: 'i' };
        if (filters?.vendor && mongoose_1.Types.ObjectId.isValid(filters.vendor)) {
            query.vendor = new mongoose_1.Types.ObjectId(filters.vendor);
        }
        return await Warehouse_model_1.GoodsReceiving.find(query)
            .populate('warehouse', 'name code')
            .populate('vendor', 'name code')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
    }
    async getReceivingById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            return null;
        return await Warehouse_model_1.GoodsReceiving.findById(id)
            .populate('warehouse', 'name code')
            .populate('vendor', 'name code contactPerson')
            .populate('createdBy', 'name email');
    }
    async updateQCVerification(id, qcData) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            return null;
        const receiving = await Warehouse_model_1.GoodsReceiving.findById(id);
        if (!receiving)
            return null;
        const updatedQC = { ...receiving.qcVerification, ...qcData };
        const qcPassed = updatedQC.packaging && updatedQC.expiry && updatedQC.label;
        const status = qcPassed ? 'qc_passed' : 'qc_failed';
        const updatedReceiving = await Warehouse_model_1.GoodsReceiving.findByIdAndUpdate(id, { qcVerification: updatedQC, status }, { new: true })
            .populate('warehouse', 'name code')
            .populate('vendor', 'name code')
            .populate('createdBy', 'name email');
        if (status === 'qc_passed' && receiving.status !== 'qc_passed') {
            await this.upsertInventory({
                sku: receiving.sku,
                productName: receiving.productName,
                batchId: receiving.batchId,
                warehouse: receiving.warehouse,
                quantity: receiving.quantity,
                location: receiving.storage,
                createdBy: receiving.createdBy
            });
        }
        return updatedReceiving;
    }
    async upsertInventory(data) {
        const existingInventory = await Warehouse_model_1.Inventory.findOne({
            sku: data.sku,
            batchId: data.batchId,
            warehouse: data.warehouse
        });
        if (existingInventory) {
            await Warehouse_model_1.Inventory.findByIdAndUpdate(existingInventory._id, {
                $inc: { quantity: data.quantity },
                location: data.location,
                updatedAt: new Date()
            });
        }
        else {
            await Warehouse_model_1.Inventory.create({
                ...data,
                warehouse: data.warehouse,
                minStockLevel: 0,
                maxStockLevel: 1000,
                age: 0,
                status: 'active'
            });
        }
    }
    async createDispatch(data, createdBy) {
        await this.validateSkuStock(data.products);
        const latestDispatch = await Warehouse_model_1.DispatchOrder.findOne().sort({ createdAt: -1 });
        const nextNumber = latestDispatch ? parseInt(latestDispatch.dispatchId?.split('-')[1] || "0") + 1 : 1;
        const dispatchId = `DO-${String(nextNumber).padStart(4, '0')}`;
        const formattedProducts = data.products.map(p => ({
            sku: p.sku,
            quantity: p.quantity
        }));
        const dispatch = await Warehouse_model_1.DispatchOrder.create({
            dispatchId,
            destination: data.destination,
            products: formattedProducts,
            assignedAgent: data.assignedAgent,
            notes: data.notes,
            status: 'pending',
            createdBy
        });
        await this.reduceStockBySku(data.products);
        return dispatch;
    }
    async getDispatches(warehouseId, filters) {
        let query = {};
        if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            query.warehouse = new mongoose_1.Types.ObjectId(warehouseId);
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.vendor && mongoose_1.Types.ObjectId.isValid(filters.vendor)) {
            query.vendor = new mongoose_1.Types.ObjectId(filters.vendor);
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.createdAt.$lte = new Date(filters.endDate);
            }
        }
        return await Warehouse_model_1.DispatchOrder.find(query)
            .populate('vendor', 'name code contactPerson phone')
            .populate('assignedAgent', 'name email phone vehicleType')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
    }
    async updateDispatchStatus(dispatchId, status) {
        const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        if (!mongoose_1.Types.ObjectId.isValid(dispatchId)) {
            throw new Error('Invalid dispatch ID');
        }
        const updateData = { status };
        if (status === 'delivered') {
            updateData.deliveredAt = new Date();
        }
        const dispatch = await Warehouse_model_1.DispatchOrder.findByIdAndUpdate(dispatchId, updateData, { new: true })
            .populate('vendor assignedAgent createdBy');
        if (!dispatch) {
            throw new Error('Dispatch order not found');
        }
        return dispatch;
    }
    async getDispatchById(dispatchId) {
        if (!mongoose_1.Types.ObjectId.isValid(dispatchId))
            return null;
        return await Warehouse_model_1.DispatchOrder.findById(dispatchId)
            .populate('vendor', 'name code contactPerson phone address')
            .populate('assignedAgent', 'name email phone vehicleType licensePlate')
            .populate('createdBy', 'name email');
    }
    async createQCTemplate(data, createdBy) {
        return await Warehouse_model_1.QCTemplate.create({
            title: data.title,
            sku: data.sku,
            parameters: data.parameters,
            isActive: true,
            createdBy
        });
    }
    async getQCTemplates(sku) {
        const query = { isActive: true };
        if (sku)
            query.sku = sku;
        return await Warehouse_model_1.QCTemplate.find(query)
            .populate('createdBy', 'name email')
            .sort({ title: 1 });
    }
    async updateQCTemplate(templateId, updateData) {
        if (!mongoose_1.Types.ObjectId.isValid(templateId))
            return null;
        return await Warehouse_model_1.QCTemplate.findByIdAndUpdate(templateId, updateData, { new: true }).populate('createdBy', 'name email');
    }
    async deleteQCTemplate(templateId) {
        if (!mongoose_1.Types.ObjectId.isValid(templateId))
            return;
        await Warehouse_model_1.QCTemplate.findByIdAndUpdate(templateId, { isActive: false });
    }
    async createReturnOrder(data, createdBy) {
        console.log('=== 📦 CREATING RETURN ORDER ===');
        console.log('Input data:', data);
        const inventory = await Warehouse_model_1.Inventory.findOne({
            batchId: data.batchId,
            isArchived: false
        });
        if (!inventory) {
            throw new Error(`Batch ${data.batchId} not found in inventory`);
        }
        const quantity = data.quantity || Math.min(inventory.quantity, 1);
        if (inventory.quantity < quantity) {
            throw new Error(`Insufficient quantity in batch. Available: ${inventory.quantity}, Requested: ${quantity}`);
        }
        const returnType = this.determineReturnType(data.reason);
        const returnOrderData = {
            batchId: data.batchId,
            vendor: data.vendor,
            reason: data.reason,
            status: data.status || 'pending',
            quantity: quantity,
            sku: inventory.sku,
            productName: inventory.productName,
            returnType: returnType,
            createdBy
        };
        console.log('Auto-populated return order:', returnOrderData);
        return await Warehouse_model_1.ReturnOrder.create(returnOrderData);
    }
    determineReturnType(reason) {
        const lowerReason = reason.toLowerCase();
        if (lowerReason.includes('damage') || lowerReason.includes('broken') || lowerReason.includes('defective')) {
            return 'damaged';
        }
        if (lowerReason.includes('expir') || lowerReason.includes('date') || lowerReason.includes('spoiled')) {
            return 'expired';
        }
        if (lowerReason.includes('wrong') || lowerReason.includes('incorrect') || lowerReason.includes('mistake')) {
            return 'wrong_item';
        }
        if (lowerReason.includes('overstock') || lowerReason.includes('excess') || lowerReason.includes('surplus')) {
            return 'overstock';
        }
        return 'other';
    }
    async getReturnQueue(warehouseId, filters) {
        let query = {};
        if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            query.warehouse = new mongoose_1.Types.ObjectId(warehouseId);
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.returnType) {
            query.returnType = filters.returnType;
        }
        return await Warehouse_model_1.ReturnOrder.find(query)
            .populate('vendor', 'name code contactPerson')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
    }
    async approveReturn(returnId) {
        if (!mongoose_1.Types.ObjectId.isValid(returnId)) {
            throw new Error('Invalid return ID');
        }
        const returnOrder = await Warehouse_model_1.ReturnOrder.findById(returnId);
        if (!returnOrder) {
            throw new Error('Return order not found');
        }
        await Warehouse_model_1.Inventory.findOneAndUpdate({
            batchId: returnOrder.batchId,
            sku: returnOrder.sku
        }, {
            $inc: { quantity: -returnOrder.quantity }
        });
        const updated = await Warehouse_model_1.ReturnOrder.findByIdAndUpdate(returnId, { status: 'approved' }, { new: true }).populate('vendor', 'name code');
        if (!updated) {
            throw new Error('Return order not found');
        }
        return updated;
    }
    async rejectReturn(returnId) {
        if (!mongoose_1.Types.ObjectId.isValid(returnId)) {
            throw new Error('Invalid return ID');
        }
        const updated = await Warehouse_model_1.ReturnOrder.findByIdAndUpdate(returnId, { status: 'rejected' }, { new: true }).populate('vendor', 'name code');
        if (!updated) {
            throw new Error('Return order not found');
        }
        return updated;
    }
    async getFieldAgents(isActive) {
        let query = {};
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
        return await Warehouse_model_1.FieldAgent.find(query)
            .populate('createdBy', 'name')
            .sort({ name: 1 });
    }
    async createFieldAgent(data, createdBy) {
        return await Warehouse_model_1.FieldAgent.create({
            ...data,
            isActive: true,
            createdBy
        });
    }
    async getInventoryDashboard(warehouseId, filters = {}, page = 1, limit = 50) {
        let query = { warehouse: new mongoose_1.Types.ObjectId(warehouseId) };
        if (filters.archived !== undefined) {
            query.isArchived = filters.archived;
        }
        else {
            query.isArchived = false;
        }
        if (filters.status && filters.status !== 'all') {
            query.status = filters.status;
        }
        if (filters.sku) {
            query.sku = { $regex: filters.sku, $options: 'i' };
        }
        if (filters.batchId) {
            query.batchId = { $regex: filters.batchId, $options: 'i' };
        }
        if (filters.productName) {
            query.productName = { $regex: filters.productName, $options: 'i' };
        }
        if (filters.expiryStatus) {
            const today = new Date();
            switch (filters.expiryStatus) {
                case 'expiring_soon':
                    const next30Days = new Date(today);
                    next30Days.setDate(today.getDate() + 30);
                    query.expiryDate = {
                        $gte: today,
                        $lte: next30Days
                    };
                    break;
                case 'expired':
                    query.expiryDate = { $lt: today };
                    break;
                case 'not_expired':
                    query.expiryDate = { $gte: today };
                    break;
                case 'no_expiry':
                    query.expiryDate = { $exists: false };
                    break;
            }
        }
        if (filters.ageRange) {
            query.age = this.getAgeFilter(filters.ageRange);
        }
        if (filters.quantityRange) {
            switch (filters.quantityRange) {
                case 'low':
                    query.quantity = { $lte: 10 };
                    break;
                case 'medium':
                    query.quantity = { $gt: 10, $lte: 50 };
                    break;
                case 'high':
                    query.quantity = { $gt: 50 };
                    break;
                case 'out_of_stock':
                    query.quantity = { $lte: 0 };
                    break;
            }
        }
        const skip = (page - 1) * limit;
        const total = await Warehouse_model_1.Inventory.countDocuments(query);
        const sortField = filters.sortBy || 'updatedAt';
        const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
        const inventory = await Warehouse_model_1.Inventory.find(query)
            .populate('warehouse', 'name code')
            .populate('createdBy', 'name email')
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit);
        return {
            inventory,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            filters
        };
    }
    async getInventoryById(inventoryId) {
        if (!mongoose_1.Types.ObjectId.isValid(inventoryId)) {
            throw new Error('Invalid inventory ID');
        }
        return await Warehouse_model_1.Inventory.findById(inventoryId)
            .populate('warehouse', 'name code')
            .populate('createdBy', 'name email');
    }
    async updateInventoryItem(inventoryId, updateData) {
        if (!mongoose_1.Types.ObjectId.isValid(inventoryId)) {
            throw new Error('Invalid inventory ID');
        }
        const inventory = await Warehouse_model_1.Inventory.findById(inventoryId);
        if (!inventory) {
            throw new Error('Inventory item not found');
        }
        const allowedUpdates = [
            'sku', 'productName', 'batchId', 'quantity',
            'minStockLevel', 'maxStockLevel', 'expiryDate', 'location'
        ];
        const updates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });
        if (updates.expiryDate) {
            updates.expiryDate = new Date(updates.expiryDate);
        }
        const now = new Date();
        const createdAt = inventory.createdAt;
        const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        updates.age = ageInDays;
        const finalQuantity = updates.quantity !== undefined ? updates.quantity : inventory.quantity;
        const finalExpiryDate = updates.expiryDate !== undefined ? updates.expiryDate : inventory.expiryDate;
        const finalMinStock = updates.minStockLevel !== undefined ? updates.minStockLevel : inventory.minStockLevel;
        const finalMaxStock = updates.maxStockLevel !== undefined ? updates.maxStockLevel : inventory.maxStockLevel;
        updates.status = this.calculateInventoryStatus({
            quantity: finalQuantity,
            minStockLevel: finalMinStock,
            maxStockLevel: finalMaxStock,
            expiryDate: finalExpiryDate
        });
        const updated = await Warehouse_model_1.Inventory.findByIdAndUpdate(inventoryId, updates, { new: true, runValidators: true }).populate('warehouse', 'name code')
            .populate('createdBy', 'name email');
        if (!updated) {
            throw new Error('Inventory item not found after update');
        }
        return updated;
    }
    async archiveInventoryItem(inventoryId) {
        if (!mongoose_1.Types.ObjectId.isValid(inventoryId)) {
            throw new Error('Invalid inventory ID');
        }
        const updated = await Warehouse_model_1.Inventory.findByIdAndUpdate(inventoryId, {
            isArchived: true,
            status: 'archived',
            archivedAt: new Date()
        }, { new: true }).populate('warehouse', 'name code')
            .populate('createdBy', 'name email');
        if (!updated) {
            throw new Error('Inventory item not found');
        }
        return updated;
    }
    async unarchiveInventoryItem(inventoryId) {
        if (!mongoose_1.Types.ObjectId.isValid(inventoryId)) {
            throw new Error('Invalid inventory ID');
        }
        const inventory = await Warehouse_model_1.Inventory.findById(inventoryId);
        if (!inventory) {
            throw new Error('Inventory item not found');
        }
        const status = this.calculateInventoryStatus({
            quantity: inventory.quantity,
            minStockLevel: inventory.minStockLevel,
            maxStockLevel: inventory.maxStockLevel,
            expiryDate: inventory.expiryDate
        });
        const updated = await Warehouse_model_1.Inventory.findByIdAndUpdate(inventoryId, {
            isArchived: false,
            status: status,
            archivedAt: null
        }, { new: true }).populate('warehouse', 'name code')
            .populate('createdBy', 'name email');
        if (!updated) {
            throw new Error('Inventory item not found');
        }
        return updated;
    }
    async getInventoryStats(warehouseId) {
        if (!mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            throw new Error('Invalid warehouse ID');
        }
        const warehouseObjectId = new mongoose_1.Types.ObjectId(warehouseId);
        const [totalItems, activeItems, archivedItems, lowStockItems, expiredItems, nearExpiryItems, statusBreakdown, stockValueResult] = await Promise.all([
            Warehouse_model_1.Inventory.countDocuments({ warehouse: warehouseObjectId }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                isArchived: false
            }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                isArchived: true
            }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                status: 'low_stock',
                isArchived: false
            }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                expiryDate: { $lt: new Date() },
                isArchived: false
            }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                expiryDate: {
                    $gte: new Date(),
                    $lte: new Date(new Date().setDate(new Date().getDate() + 30))
                },
                isArchived: false
            }),
            Warehouse_model_1.Inventory.aggregate([
                {
                    $match: {
                        warehouse: warehouseObjectId,
                        isArchived: false
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Warehouse_model_1.Inventory.aggregate([
                {
                    $match: {
                        warehouse: warehouseObjectId,
                        isArchived: false
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalValue: {
                            $sum: {
                                $multiply: ['$quantity', 100]
                            }
                        }
                    }
                }
            ])
        ]);
        const statusBreakdownObj = {};
        statusBreakdown.forEach((item) => {
            statusBreakdownObj[item._id] = item.count;
        });
        const totalStockValue = stockValueResult.length > 0 ? stockValueResult[0].totalValue : 0;
        return {
            totalItems,
            activeItems,
            archivedItems,
            lowStockItems,
            expiredItems,
            nearExpiryItems,
            totalStockValue,
            statusBreakdown: statusBreakdownObj
        };
    }
    async bulkArchiveInventory(inventoryIds) {
        const validIds = inventoryIds.filter(id => mongoose_1.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            throw new Error('No valid inventory IDs provided');
        }
        const objectIds = validIds.map(id => new mongoose_1.Types.ObjectId(id));
        const result = await Warehouse_model_1.Inventory.updateMany({
            _id: { $in: objectIds },
            isArchived: false
        }, {
            $set: {
                isArchived: true,
                status: 'archived',
                archivedAt: new Date()
            }
        });
        const archivedCount = result.modifiedCount;
        const failedCount = validIds.length - archivedCount;
        let failedIds = [];
        if (failedCount > 0) {
            const archivedItems = await Warehouse_model_1.Inventory.find({
                _id: { $in: objectIds },
                isArchived: true
            }).select('_id');
            const archivedItemIds = archivedItems.map(item => item._id.toString());
            failedIds = validIds.filter(id => !archivedItemIds.includes(id));
        }
        return {
            success: archivedCount > 0,
            message: `Successfully archived ${archivedCount} items. ${failedCount} items failed to archive.`,
            archivedCount,
            failedCount,
            failedIds
        };
    }
    async bulkUnarchiveInventory(inventoryIds) {
        const validIds = inventoryIds.filter(id => mongoose_1.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            throw new Error('No valid inventory IDs provided');
        }
        const objectIds = validIds.map(id => new mongoose_1.Types.ObjectId(id));
        const itemsToUnarchive = await Warehouse_model_1.Inventory.find({
            _id: { $in: objectIds },
            isArchived: true
        });
        const updatePromises = itemsToUnarchive.map(async (item) => {
            const status = this.calculateInventoryStatus({
                quantity: item.quantity,
                minStockLevel: item.minStockLevel,
                maxStockLevel: item.maxStockLevel,
                expiryDate: item.expiryDate
            });
            return Warehouse_model_1.Inventory.findByIdAndUpdate(item._id, {
                $set: {
                    isArchived: false,
                    status: status,
                    archivedAt: null
                }
            });
        });
        await Promise.all(updatePromises);
        const unarchivedCount = itemsToUnarchive.length;
        const failedCount = validIds.length - unarchivedCount;
        let failedIds = [];
        if (failedCount > 0) {
            const unarchivedItems = await Warehouse_model_1.Inventory.find({
                _id: { $in: objectIds },
                isArchived: false
            }).select('_id');
            const unarchivedItemIds = unarchivedItems.map(item => item._id.toString());
            failedIds = validIds.filter(id => !unarchivedItemIds.includes(id));
        }
        return {
            success: unarchivedCount > 0,
            message: `Successfully unarchived ${unarchivedCount} items. ${failedCount} items failed to unarchive.`,
            unarchivedCount,
            failedCount,
            failedIds
        };
    }
    async getArchivedInventory(warehouseId, page = 1, limit = 50) {
        const query = {
            warehouse: new mongoose_1.Types.ObjectId(warehouseId),
            isArchived: true
        };
        const skip = (page - 1) * limit;
        const total = await Warehouse_model_1.Inventory.countDocuments(query);
        const inventory = await Warehouse_model_1.Inventory.find(query)
            .populate('warehouse', 'name code')
            .populate('createdBy', 'name email')
            .sort({ archivedAt: -1 })
            .skip(skip)
            .limit(limit);
        return {
            inventory,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
    async createExpense(data, createdBy) {
        return await Warehouse_model_1.Expense.create({
            ...data,
            status: 'pending',
            paymentStatus: 'unpaid',
            createdBy
        });
    }
    async getExpenses(warehouseId, filters) {
        let query = {};
        if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            query.warehouseId = new mongoose_1.Types.ObjectId(warehouseId);
        }
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.paymentStatus) {
            query.paymentStatus = filters.paymentStatus;
        }
        if (filters?.startDate || filters?.endDate) {
            query.date = {};
            if (filters.startDate) {
                query.date.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.date.$lte = new Date(filters.endDate);
            }
        }
        if (filters?.month) {
            const [year, month] = filters.month.split('-');
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(Number(year), Number(month), 0);
            endDate.setHours(23, 59, 59, 999);
            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }
        return await Warehouse_model_1.Expense.find(query)
            .populate('vendor', 'name code contactPerson')
            .populate('warehouseId', 'name code')
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('assignedAgent', 'name email')
            .sort({ date: -1, createdAt: -1 });
    }
    async updateExpenseStatus(expenseId, status, approvedBy) {
        const validStatuses = ['approved', 'pending', 'rejected'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        const updateData = { status };
        if (status === 'approved' && approvedBy) {
            updateData.approvedBy = approvedBy;
            updateData.approvedAt = new Date();
        }
        else if (status === 'pending') {
            updateData.approvedBy = null;
            updateData.approvedAt = null;
        }
        const expense = await Warehouse_model_1.Expense.findByIdAndUpdate(expenseId, updateData, { new: true })
            .populate('vendor warehouse createdBy approvedBy');
        if (!expense) {
            throw new Error('Expense not found');
        }
        return expense;
    }
    async updateExpensePaymentStatus(expenseId, paymentStatus) {
        const validPaymentStatuses = ['paid', 'unpaid', 'partially_paid'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            throw new Error(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`);
        }
        const expense = await Warehouse_model_1.Expense.findByIdAndUpdate(expenseId, { paymentStatus }, { new: true })
            .populate('vendor warehouse createdBy approvedBy');
        if (!expense) {
            throw new Error('Expense not found');
        }
        return expense;
    }
    async updateExpense(expenseId, updateData) {
        const allowedUpdates = ['category', 'amount', 'date', 'status'];
        const updates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });
        if (updates.amount !== undefined ||
            updates.category !== undefined ||
            updates.date !== undefined) {
            updates.status = 'pending';
            updates.approvedBy = null;
            updates.approvedAt = null;
        }
        const expense = await Warehouse_model_1.Expense.findByIdAndUpdate(expenseId, updates, { new: true, runValidators: true })
            .populate('vendor createdBy approvedBy warehouseId');
        if (!expense) {
            throw new Error('Expense not found');
        }
        return expense;
    }
    async deleteExpense(expenseId) {
        if (!mongoose_1.Types.ObjectId.isValid(expenseId)) {
            throw new Error('Invalid expense ID');
        }
        const result = await Warehouse_model_1.Expense.findByIdAndDelete(expenseId);
        if (!result) {
            throw new Error('Expense not found');
        }
    }
    async getExpenseById(expenseId) {
        if (!mongoose_1.Types.ObjectId.isValid(expenseId))
            return null;
        return await Warehouse_model_1.Expense.findById(expenseId)
            .populate('vendor', 'name code contactPerson phone email')
            .populate('warehouseId', 'name code location')
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email');
    }
    async getExpenseSummary(warehouseId, filters) {
        const matchStage = { warehouseId: new mongoose_1.Types.ObjectId(warehouseId) };
        if (filters?.dateRange) {
            matchStage.date = this.getDateFilter(filters.dateRange);
        }
        if (filters?.month) {
            const [year, month] = filters.month.split('-');
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(Number(year), Number(month), 0);
            endDate.setHours(23, 59, 59, 999);
            matchStage.date = {
                $gte: startDate,
                $lte: endDate
            };
        }
        const summary = await Warehouse_model_1.Expense.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    approved: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'rejected'] }, '$amount', 0]
                        }
                    },
                    byCategory: {
                        $push: {
                            category: '$category',
                            amount: '$amount'
                        }
                    },
                    byMonth: {
                        $push: {
                            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
                            amount: '$amount'
                        }
                    },
                    paid: {
                        $sum: {
                            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0]
                        }
                    },
                    unpaid: {
                        $sum: {
                            $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$amount', 0]
                        }
                    },
                    partially_paid: {
                        $sum: {
                            $cond: [{ $eq: ['$paymentStatus', 'partially_paid'] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);
        const result = summary[0] || {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            byCategory: [],
            byMonth: [],
            paid: 0,
            unpaid: 0,
            partially_paid: 0
        };
        const byCategory = {};
        if (result.byCategory) {
            result.byCategory.forEach((item) => {
                byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
            });
        }
        const byMonth = {};
        if (result.byMonth) {
            result.byMonth.forEach((item) => {
                byMonth[item.month] = (byMonth[item.month] || 0) + item.amount;
            });
        }
        return {
            total: result.total,
            approved: result.approved,
            pending: result.pending,
            rejected: result.rejected,
            byCategory,
            byMonth,
            paymentSummary: {
                paid: result.paid,
                unpaid: result.unpaid,
                partially_paid: result.partially_paid
            }
        };
    }
    async getMonthlyExpenseTrend(warehouseId, months = 12) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        return await Warehouse_model_1.Expense.aggregate([
            {
                $match: {
                    warehouseId: new mongoose_1.Types.ObjectId(warehouseId),
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalAmount: { $sum: '$amount' },
                    approvedAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
                        }
                    },
                    pendingAmount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
                        }
                    },
                    expenseCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: {
                        $concat: [
                            { $toString: '$_id.year' },
                            '-',
                            { $toString: { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] } }
                        ]
                    },
                    totalAmount: 1,
                    approvedAmount: 1,
                    pendingAmount: 1,
                    expenseCount: 1
                }
            },
            { $sort: { period: 1 } }
        ]);
    }
    async generateReport(type, filters) {
        switch (type) {
            case 'inventory_summary':
                return await this.generateInventorySummaryReport(filters);
            case 'purchase_orders':
                return await this.generatePurchaseOrderReport(filters);
            case 'inventory_turnover':
                return await this.generateInventoryTurnoverReport(filters);
            case 'qc_summary':
                return await this.generateQCSummaryReport(filters);
            case 'efficiency':
                return await this.generateEfficiencyReport(filters);
            case 'stock_ageing':
                return await this.getStockAgeingReport(filters.warehouse);
            default:
                throw new Error('Invalid report type');
        }
    }
    getStockAgeingReport(_warehouse) {
        throw new Error('Method not implemented.');
    }
    async generateInventorySummaryReport(filters) {
        const warehouseId = filters.warehouse;
        if (!warehouseId || !mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            throw new Error('Valid warehouse ID is required');
        }
        const dateFilter = this.getDateFilter(filters.dateRange);
        let inventoryQuery = {
            warehouse: new mongoose_1.Types.ObjectId(warehouseId),
            isArchived: false
        };
        if (filters.category) {
            inventoryQuery.productName = { $regex: filters.category, $options: 'i' };
        }
        if (filters.status) {
            inventoryQuery.status = filters.status;
        }
        const inventoryData = await Warehouse_model_1.Inventory.find(inventoryQuery)
            .populate('warehouse', 'name code');
        const totalSKUs = await Warehouse_model_1.Inventory.distinct('sku', {
            warehouse: new mongoose_1.Types.ObjectId(warehouseId),
            isArchived: false
        }).then(skus => skus.length);
        const stockOutSKUs = await Warehouse_model_1.Inventory.countDocuments({
            warehouse: new mongoose_1.Types.ObjectId(warehouseId),
            status: 'low_stock',
            isArchived: false
        });
        const poQuery = { warehouse: new mongoose_1.Types.ObjectId(warehouseId) };
        if (Object.keys(dateFilter).length > 0) {
            poQuery.createdAt = dateFilter;
        }
        if (filters.vendor) {
            poQuery.vendor = new mongoose_1.Types.ObjectId(filters.vendor);
        }
        const totalPOs = await Warehouse_model_1.GoodsReceiving.countDocuments(poQuery);
        const pendingPOs = await Warehouse_model_1.GoodsReceiving.countDocuments({
            ...poQuery,
            status: 'qc_pending'
        });
        const totalStockValue = inventoryData.reduce((sum, item) => {
            return sum + (item.quantity * 100);
        }, 0);
        const lowStockItems = inventoryData.filter(item => item.status === 'low_stock').length;
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);
        const nearExpirySKUs = inventoryData.filter(item => item.expiryDate &&
            item.expiryDate <= next30Days &&
            item.expiryDate >= today).length;
        const stockAccuracy = 89;
        const { pendingRefills, completedRefills } = await this.getRefillMetrics(warehouseId);
        return {
            summary: {
                totalSKUs,
                stockOutSKUs,
                totalPOs,
                pendingPOs,
                pendingRefills,
                completedRefills,
                totalStockValue,
                lowStockItems,
                nearExpirySKUs,
                stockAccuracy
            },
            inventoryDetails: inventoryData,
            generatedOn: new Date(),
            filters: filters
        };
    }
    async generatePurchaseOrderReport(filters) {
        const warehouseId = filters.warehouse;
        if (!warehouseId || !mongoose_1.Types.ObjectId.isValid(warehouseId)) {
            throw new Error('Valid warehouse ID is required');
        }
        const dateFilter = this.getDateFilter(filters.dateRange);
        let poQuery = { warehouse: new mongoose_1.Types.ObjectId(warehouseId) };
        if (Object.keys(dateFilter).length > 0) {
            poQuery.createdAt = dateFilter;
        }
        if (filters.vendor) {
            poQuery.vendor = new mongoose_1.Types.ObjectId(filters.vendor);
        }
        if (filters.status) {
            poQuery.status = filters.status;
        }
        const purchaseOrders = await Warehouse_model_1.GoodsReceiving.find(poQuery)
            .populate('vendor', 'name code contactPerson')
            .populate('warehouse', 'name code')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        const totalPOs = purchaseOrders.length;
        const pendingPOs = purchaseOrders.filter(po => po.status === 'qc_pending').length;
        const approvedPOs = purchaseOrders.filter(po => po.status === 'qc_passed').length;
        const rejectedPOs = purchaseOrders.filter(po => po.status === 'qc_failed').length;
        const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (po.quantity * 100), 0);
        const averagePOValue = totalPOs > 0 ? totalPOValue / totalPOs : 0;
        return {
            summary: {
                totalPOs,
                pendingPOs,
                approvedPOs,
                rejectedPOs,
                totalPOValue,
                averagePOValue
            },
            purchaseOrders,
            generatedOn: new Date(),
            filters: filters
        };
    }
    async getRefillMetrics(_warehouseId) {
        return {
            pendingRefills: 32,
            completedRefills: 77
        };
    }
    async generateInventoryTurnoverReport(filters) {
        const { warehouse, startDate, endDate, category } = filters;
        if (!warehouse || !mongoose_1.Types.ObjectId.isValid(warehouse)) {
            throw new Error('Valid warehouse ID is required');
        }
        const matchStage = {
            warehouse: new mongoose_1.Types.ObjectId(warehouse),
            isArchived: false
        };
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (category) {
            matchStage.productName = { $regex: category, $options: 'i' };
        }
        const turnoverData = await Warehouse_model_1.Inventory.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$sku',
                    sku: { $first: '$sku' },
                    productName: { $first: '$productName' },
                    category: { $first: '$productName' },
                    currentQuantity: { $first: '$quantity' },
                    averageStock: { $avg: '$quantity' },
                    totalReceived: { $sum: '$quantity' },
                    stockOutCount: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'low_stock'] }, 1, 0]
                        }
                    },
                    lastUpdated: { $max: '$updatedAt' }
                }
            },
            {
                $project: {
                    sku: 1,
                    productName: 1,
                    category: 1,
                    currentQuantity: 1,
                    averageStock: 1,
                    totalReceived: 1,
                    stockOutCount: 1,
                    turnoverRate: {
                        $cond: [
                            { $gt: ['$averageStock', 0] },
                            { $divide: ['$totalReceived', '$averageStock'] },
                            0
                        ]
                    },
                    lastUpdated: 1
                }
            },
            { $sort: { turnoverRate: -1 } }
        ]);
        return {
            report: 'inventory_turnover',
            data: turnoverData,
            summary: {
                totalSKUs: turnoverData.length,
                averageTurnover: turnoverData.length > 0 ?
                    turnoverData.reduce((acc, item) => acc + item.turnoverRate, 0) / turnoverData.length : 0,
                highTurnoverItems: turnoverData.filter((item) => item.turnoverRate > 2).length,
                lowTurnoverItems: turnoverData.filter((item) => item.turnoverRate < 0.5).length
            },
            generatedOn: new Date(),
            filters: filters
        };
    }
    async generateQCSummaryReport(filters) {
        const { warehouse, startDate, endDate, vendor } = filters;
        if (!warehouse || !mongoose_1.Types.ObjectId.isValid(warehouse)) {
            throw new Error('Valid warehouse ID is required');
        }
        const matchStage = {
            warehouse: new mongoose_1.Types.ObjectId(warehouse)
        };
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        if (vendor) {
            matchStage.vendor = new mongoose_1.Types.ObjectId(vendor);
        }
        const qcData = await Warehouse_model_1.GoodsReceiving.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalValue: { $sum: { $multiply: ['$quantity', 100] } }
                }
            }
        ]);
        const totalReceivings = qcData.reduce((acc, item) => acc + item.count, 0);
        const passRate = totalReceivings > 0
            ? (qcData.find((item) => item._id === 'qc_passed')?.count || 0) / totalReceivings * 100
            : 0;
        const qcDetails = await Warehouse_model_1.GoodsReceiving.find(matchStage)
            .populate('vendor', 'name code')
            .populate('warehouse', 'name code')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        return {
            report: 'qc_summary',
            data: qcData,
            details: qcDetails,
            summary: {
                totalReceivings,
                passRate: Math.round(passRate * 100) / 100,
                failedCount: qcData.find((item) => item._id === 'qc_failed')?.count || 0,
                pendingCount: qcData.find((item) => item._id === 'qc_pending')?.count || 0,
                totalValue: qcData.reduce((acc, item) => acc + item.totalValue, 0)
            },
            generatedOn: new Date(),
            filters: filters
        };
    }
    async exportReport(type, format, filters) {
        const reportData = await this.generateReport(type, filters);
        if (format === 'csv') {
            return this.convertToCSV(reportData, type);
        }
        else if (format === 'pdf') {
            return this.convertToPDF(reportData, type);
        }
        return reportData;
    }
    convertToCSV(data, reportType) {
        let csv = '';
        switch (reportType) {
            case 'inventory_summary':
                csv = this.convertInventorySummaryToCSV(data);
                break;
            case 'purchase_orders':
                csv = this.convertPurchaseOrdersToCSV(data);
                break;
            case 'stock_ageing':
                csv = this.convertStockAgeingToCSV(data);
                break;
            case 'inventory_turnover':
                csv = this.convertInventoryTurnoverToCSV(data);
                break;
            case 'qc_summary':
                csv = this.convertQCSummaryToCSV(data);
                break;
            default:
                csv = 'Report Type,Data\n';
                csv += `${reportType},"${JSON.stringify(data)}"`;
        }
        return csv;
    }
    convertInventorySummaryToCSV(data) {
        let csv = 'Inventory Summary Report\n';
        csv += `Generated On: ${data.generatedOn.toISOString().split('T')[0]}\n\n`;
        csv += 'SUMMARY METRICS\n';
        csv += 'Metric,Value\n';
        csv += `Total SKUs,${data.summary.totalSKUs}\n`;
        csv += `Stock-Out SKUs,${data.summary.stockOutSKUs}\n`;
        csv += `Total POs,${data.summary.totalPOs}\n`;
        csv += `Pending POs,${data.summary.pendingPOs}\n`;
        csv += `Total Stock Value,${data.summary.totalStockValue}\n`;
        csv += `Low Stock Items,${data.summary.lowStockItems}\n`;
        csv += `Near-Expiry SKUs,${data.summary.nearExpirySKUs}\n`;
        csv += `Stock Accuracy,${data.summary.stockAccuracy}%\n\n`;
        csv += 'INVENTORY DETAILS\n';
        csv += 'SKU ID,Product Name,Category,Current Qty,Threshold,Stock Status,Last Updated\n';
        data.inventoryDetails.forEach((item) => {
            const threshold = this.getStockThreshold(item.quantity, item.minStockLevel, item.maxStockLevel);
            const lastUpdated = item.updatedAt.toISOString().split('T')[0];
            csv += `"${item.sku}","${item.productName}","${this.extractCategory(item.productName)}",${item.quantity},${threshold},"${item.status}","${lastUpdated}"\n`;
        });
        return csv;
    }
    convertPurchaseOrdersToCSV(data) {
        let csv = 'Purchase Orders Report\n';
        csv += `Generated On: ${data.generatedOn.toISOString().split('T')[0]}\n\n`;
        csv += 'SUMMARY METRICS\n';
        csv += 'Metric,Value\n';
        csv += `Total POs,${data.summary.totalPOs}\n`;
        csv += `Pending POs,${data.summary.pendingPOs}\n`;
        csv += `Approved POs,${data.summary.approvedPOs}\n`;
        csv += `Rejected POs,${data.summary.rejectedPOs}\n`;
        csv += `Total PO Value,${data.summary.totalPOValue}\n`;
        csv += `Average PO Value,${data.summary.averagePOValue.toFixed(2)}\n\n`;
        csv += 'PURCHASE ORDER DETAILS\n';
        csv += 'PO Number,Vendor,SKU,Product Name,Quantity,Status,Received Date\n';
        data.purchaseOrders.forEach((po) => {
            const receivedDate = po.createdAt.toISOString().split('T')[0];
            const vendorName = po.vendor?.name || 'N/A';
            csv += `"${po.poNumber}","${vendorName}","${po.sku}","${po.productName}",${po.quantity},"${po.status}","${receivedDate}"\n`;
        });
        return csv;
    }
    getStockThreshold(quantity, minStock, maxStock) {
        if (quantity <= minStock)
            return 'Low';
        if (quantity >= maxStock * 0.9)
            return 'High';
        return 'Normal';
    }
    extractCategory(productName) {
        if (productName.toLowerCase().includes('lays') || productName.toLowerCase().includes('snack')) {
            return 'Snacks';
        }
        if (productName.toLowerCase().includes('beverage') || productName.toLowerCase().includes('drink')) {
            return 'Beverages';
        }
        return 'General';
    }
    convertToPDF(data, reportType) {
        return {
            message: 'PDF generation would be implemented here',
            data: data,
            format: 'pdf',
            reportType: reportType
        };
    }
    getAgeFilter(ageRange) {
        switch (ageRange) {
            case '0-30':
                return { $lte: 30 };
            case '31-60':
                return { $gt: 30, $lte: 60 };
            case '61-90':
                return { $gt: 60, $lte: 90 };
            case '90+':
                return { $gt: 90 };
            default:
                return {};
        }
    }
    async generateAlerts(warehouseId) {
        const alerts = [];
        try {
            const baseQuery = {};
            if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
                baseQuery.warehouse = new mongoose_1.Types.ObjectId(warehouseId);
            }
            const qcFailed = await Warehouse_model_1.GoodsReceiving.countDocuments({
                ...baseQuery,
                status: 'qc_failed'
            });
            if (qcFailed > 0) {
                alerts.push({
                    type: 'qc_failed',
                    message: `${qcFailed} batches failed QC`,
                    count: qcFailed
                });
            }
            const lowStock = await Warehouse_model_1.Inventory.countDocuments({
                ...baseQuery,
                status: 'low_stock',
                isArchived: false
            });
            if (lowStock > 0) {
                alerts.push({
                    type: 'low_stock',
                    message: `${lowStock} items below safety stock`,
                    count: lowStock
                });
            }
        }
        catch (error) {
            console.error('Error generating alerts:', error);
        }
        return alerts;
    }
    async getRecentActivities(warehouseId) {
        try {
            const baseQuery = {};
            if (warehouseId && mongoose_1.Types.ObjectId.isValid(warehouseId)) {
                baseQuery.warehouse = new mongoose_1.Types.ObjectId(warehouseId);
            }
            const [receivingActivities, dispatchActivities] = await Promise.all([
                Warehouse_model_1.GoodsReceiving.find(baseQuery)
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('createdBy', 'name'),
                Warehouse_model_1.DispatchOrder.find(baseQuery)
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('assignedAgent', 'name')
            ]);
            const activities = [
                ...receivingActivities.map((item) => ({
                    type: 'inbound',
                    message: `Received ${item.quantity} units of ${item.sku}`,
                    timestamp: item.createdAt,
                    user: item.createdBy?.name || 'System'
                })),
                ...dispatchActivities.map((item) => ({
                    type: 'outbound',
                    message: `Dispatched ${item.products?.length || 0} products to ${item.destination}`,
                    timestamp: item.createdAt,
                    user: item.assignedAgent?.name || 'System'
                }))
            ];
            return activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 8);
        }
        catch (error) {
            console.error('Error getting recent activities:', error);
            return [];
        }
    }
    async validateSkuStock(products) {
        for (const product of products) {
            const inventory = await Warehouse_model_1.Inventory.findOne({
                sku: product.sku,
                isArchived: false
            });
            if (!inventory || inventory.quantity < product.quantity) {
                throw new Error(`Insufficient stock for ${product.sku}. Available: ${inventory?.quantity || 0}, Requested: ${product.quantity}`);
            }
        }
    }
    async reduceStockBySku(products) {
        for (const product of products) {
            await Warehouse_model_1.Inventory.findOneAndUpdate({ sku: product.sku, isArchived: false }, {
                $inc: { quantity: -product.quantity },
                $set: { updatedAt: new Date() }
            });
        }
    }
    calculateInventoryStatus(data) {
        const today = new Date();
        if (data.expiryDate && data.expiryDate < today) {
            return 'expired';
        }
        if (data.quantity <= data.minStockLevel) {
            return 'low_stock';
        }
        if (data.quantity >= data.maxStockLevel * 0.9) {
            return 'overstock';
        }
        return 'active';
    }
    async generateEfficiencyReport(filters) {
        const { warehouse, startDate, endDate } = filters;
        if (!warehouse || !mongoose_1.Types.ObjectId.isValid(warehouse)) {
            throw new Error('Valid warehouse ID is required');
        }
        const dateMatch = {};
        if (startDate && endDate) {
            dateMatch.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        const [dispatchEfficiency, inventoryEfficiency] = await Promise.all([
            Warehouse_model_1.DispatchOrder.aggregate([
                {
                    $match: {
                        warehouse: new mongoose_1.Types.ObjectId(warehouse),
                        status: 'delivered',
                        ...dateMatch
                    }
                },
                {
                    $project: {
                        dispatchId: 1,
                        processingTime: {
                            $divide: [
                                { $subtract: ['$updatedAt', '$createdAt'] },
                                1000 * 60 * 60
                            ]
                        },
                        productsCount: { $size: '$products' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgProcessingTime: { $avg: '$processingTime' },
                        totalDispatches: { $sum: 1 },
                        totalProductsDispatched: { $sum: '$productsCount' }
                    }
                }
            ]),
            Warehouse_model_1.Inventory.aggregate([
                {
                    $match: {
                        warehouse: new mongoose_1.Types.ObjectId(warehouse),
                        isArchived: false,
                        ...dateMatch
                    }
                },
                {
                    $project: {
                        utilizationRate: {
                            $cond: [
                                { $gt: ['$maxStockLevel', 0] },
                                { $divide: ['$quantity', '$maxStockLevel'] },
                                0
                            ]
                        },
                        isLowStock: { $eq: ['$status', 'low_stock'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgUtilization: { $avg: '$utilizationRate' },
                        lowStockCount: { $sum: { $cond: ['$isLowStock', 1, 0] } },
                        totalItems: { $sum: 1 }
                    }
                }
            ])
        ]);
        return {
            report: 'efficiency',
            dispatchEfficiency: dispatchEfficiency[0] || {},
            inventoryEfficiency: inventoryEfficiency[0] || {},
            overallScore: this.calculateOverallEfficiencyScore(dispatchEfficiency[0], inventoryEfficiency[0]),
            generatedOn: new Date(),
            filters: filters
        };
    }
    calculateOverallEfficiencyScore(dispatchData, inventoryData) {
        let score = 0;
        if (dispatchData?.avgProcessingTime) {
            const processingScore = Math.max(0, 100 - (dispatchData.avgProcessingTime / 48 * 100));
            score += processingScore * 0.4;
        }
        if (inventoryData?.avgUtilization) {
            const utilizationScore = Math.min(100, inventoryData.avgUtilization * 100 * 1.25);
            score += utilizationScore * 0.4;
        }
        if (inventoryData?.lowStockCount && inventoryData?.totalItems) {
            const lowStockRate = inventoryData.lowStockCount / inventoryData.totalItems;
            const lowStockScore = Math.max(0, 100 - (lowStockRate * 500));
            score += lowStockScore * 0.2;
        }
        return Math.round(score);
    }
    convertStockAgeingToCSV(data) {
        let csv = 'Stock Ageing Report\n';
        csv += 'Age Range,Count\n';
        if (data.ageingBuckets) {
            Object.entries(data.ageingBuckets).forEach(([range, count]) => {
                csv += `${range},${count}\n`;
            });
        }
        if (data.details && Array.isArray(data.details)) {
            csv += '\nSKU,Product Name,Batch ID,Quantity,Age (Days),Location\n';
            data.details.forEach((item) => {
                csv += `"${item.sku}","${item.productName}","${item.batchId}",${item.quantity},${item.age},"${item.location.zone}-${item.location.aisle}-${item.location.rack}-${item.location.bin}"\n`;
            });
        }
        return csv;
    }
    convertInventoryTurnoverToCSV(data) {
        let csv = 'Inventory Turnover Report\n';
        csv += 'SKU,Product Name,Turnover Rate,Average Stock,Total Received,Stock Out Count\n';
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach((item) => {
                csv += `"${item.sku}","${item.productName}",${item.turnoverRate},${item.averageStock},${item.totalReceived},${item.stockOutCount}\n`;
            });
        }
        return csv;
    }
    convertQCSummaryToCSV(data) {
        let csv = 'QC Summary Report\n';
        csv += 'Status,Count,Total Quantity\n';
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach((item) => {
                csv += `${item._id},${item.count},${item.totalQuantity}\n`;
            });
        }
        return csv;
    }
}
exports.warehouseService = new WarehouseService();
//# sourceMappingURL=warehouse.service.js.map