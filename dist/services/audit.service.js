"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const models_1 = require("../models");
class AuditService {
    async createAuditLog(data) {
        return await models_1.AuditLog.create({
            timestamp: new Date(),
            ...data
        });
    }
    async getAuditLogs(query) {
        const { page, limit, startDate, endDate, actor, module, action, targetType, targetId, sortBy, sortOrder } = query;
        const filter = {};
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {
                filter.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.timestamp.$lte = new Date(endDate);
            }
        }
        if (actor) {
            filter.actor = actor;
        }
        if (module) {
            filter.module = { $regex: module, $options: 'i' };
        }
        if (action) {
            filter.action = { $regex: action, $options: 'i' };
        }
        if (targetType) {
            filter['target.type'] = { $regex: targetType, $options: 'i' };
        }
        if (targetId) {
            filter['target.id'] = targetId;
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            models_1.AuditLog.find(filter)
                .populate('actor', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            models_1.AuditLog.countDocuments(filter)
        ]);
        const pages = Math.ceil(total / limit);
        return {
            logs,
            total,
            page,
            limit,
            pages
        };
    }
    async getAuditLogById(id) {
        return await models_1.AuditLog.findById(id)
            .populate('actor', 'name email');
    }
    async getAuditLogsByActor(actorId, limit = 50) {
        return await models_1.AuditLog.find({ actor: actorId })
            .sort({ timestamp: -1 })
            .limit(limit);
    }
    async getAuditLogsByTarget(targetType, targetId) {
        return await models_1.AuditLog.find({
            'target.type': targetType,
            'target.id': targetId
        })
            .populate('actor', 'name email')
            .sort({ timestamp: -1 });
    }
    async getAuditLogsByModule(module, limit = 100) {
        return await models_1.AuditLog.find({ module })
            .populate('actor', 'name email')
            .sort({ timestamp: -1 })
            .limit(limit);
    }
    async getAuditStats(startDate, endDate) {
        const filter = {};
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {
                filter.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.timestamp.$lte = new Date(endDate);
            }
        }
        const [totalLogs, logsByModule, logsByAction, logsByActor, recentActivity] = await Promise.all([
            models_1.AuditLog.countDocuments(filter),
            models_1.AuditLog.aggregate([
                { $match: filter },
                { $group: { _id: '$module', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            models_1.AuditLog.aggregate([
                { $match: filter },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            models_1.AuditLog.aggregate([
                { $match: filter },
                { $group: { _id: '$actor', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            models_1.AuditLog.find(filter)
                .populate('actor', 'name email')
                .sort({ timestamp: -1 })
                .limit(10)
        ]);
        return {
            totalLogs,
            logsByModule: logsByModule.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            logsByAction: logsByAction.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            logsByActor: logsByActor.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            recentActivity
        };
    }
    async exportAuditLogs(query) {
        const { startDate, endDate, actor, module, action, targetType, targetId, sortBy, sortOrder } = query;
        const filter = {};
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {
                filter.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.timestamp.$lte = new Date(endDate);
            }
        }
        if (actor)
            filter.actor = actor;
        if (module)
            filter.module = { $regex: module, $options: 'i' };
        if (action)
            filter.action = { $regex: action, $options: 'i' };
        if (targetType)
            filter['target.type'] = { $regex: targetType, $options: 'i' };
        if (targetId)
            filter['target.id'] = targetId;
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        return await models_1.AuditLog.find(filter)
            .populate('actor', 'name email')
            .sort(sort)
            .limit(10000);
    }
    async deleteOldAuditLogs(daysToKeep = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await models_1.AuditLog.deleteMany({
            timestamp: { $lt: cutoffDate }
        });
        return { deletedCount: result.deletedCount || 0 };
    }
    async getAuditLogsByDateRange(startDate, endDate) {
        return await models_1.AuditLog.find({
            timestamp: {
                $gte: startDate,
                $lte: endDate
            }
        })
            .populate('actor', 'name email')
            .sort({ timestamp: -1 });
    }
    async searchAuditLogs(searchTerm, limit = 50) {
        return await models_1.AuditLog.find({
            $or: [
                { action: { $regex: searchTerm, $options: 'i' } },
                { module: { $regex: searchTerm, $options: 'i' } },
                { 'target.type': { $regex: searchTerm, $options: 'i' } },
                { 'target.name': { $regex: searchTerm, $options: 'i' } }
            ]
        })
            .populate('actor', 'name email')
            .sort({ timestamp: -1 })
            .limit(limit);
    }
}
exports.auditService = new AuditService();
//# sourceMappingURL=audit.service.js.map