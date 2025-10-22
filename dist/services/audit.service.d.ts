import { IAuditLog } from '../models';
export interface AuditQuery {
    page: number;
    limit: number;
    startDate?: string;
    endDate?: string;
    actor?: string;
    module?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}
export interface PaginatedAuditLogs {
    logs: IAuditLog[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export interface CreateAuditLogData {
    actor: string;
    action: string;
    module: string;
    target: {
        type: string;
        id: string;
        name?: string;
    };
    changes?: {
        before?: any;
        after?: any;
    };
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}
declare class AuditService {
    createAuditLog(data: CreateAuditLogData): Promise<IAuditLog>;
    getAuditLogs(query: AuditQuery): Promise<PaginatedAuditLogs>;
    getAuditLogById(id: string): Promise<IAuditLog | null>;
    getAuditLogsByActor(actorId: string, limit?: number): Promise<IAuditLog[]>;
    getAuditLogsByTarget(targetType: string, targetId: string): Promise<IAuditLog[]>;
    getAuditLogsByModule(module: string, limit?: number): Promise<IAuditLog[]>;
    getAuditStats(startDate?: string, endDate?: string): Promise<{
        totalLogs: number;
        logsByModule: {
            [module: string]: number;
        };
        logsByAction: {
            [action: string]: number;
        };
        logsByActor: {
            [actor: string]: number;
        };
        recentActivity: IAuditLog[];
    }>;
    exportAuditLogs(query: Omit<AuditQuery, 'page' | 'limit'>): Promise<IAuditLog[]>;
    deleteOldAuditLogs(daysToKeep?: number): Promise<{
        deletedCount: number;
    }>;
    getAuditLogsByDateRange(startDate: Date, endDate: Date): Promise<IAuditLog[]>;
    searchAuditLogs(searchTerm: string, limit?: number): Promise<IAuditLog[]>;
}
export declare const auditService: AuditService;
export {};
//# sourceMappingURL=audit.service.d.ts.map