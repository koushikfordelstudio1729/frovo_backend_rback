import { Router } from 'express';
import { historyController } from '../controllers/historyCatalogue.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

// Permission constants
const SUPER_ADMIN_ONLY = ['super_admin'];
const ADMIN_ACCESS = ['super_admin', 'warehouse_manager'];


const router = Router();

// ============================================================================
// AUDIT TRAIL ROUTES
// ============================================================================

/**
 * @route   GET /api/audit/entity/:entityType/:entityId
 * @desc    Get audit logs for specific entity (category or catalogue)
 * @access  Admin+ only
 * @example GET /api/audit/entity/category/69413b4c7a1a8e0a937f92ed
 * @example GET /api/audit/entity/catalogue/675abc123def456789012345?operation=update
 */
router.get('/entity/:entityType/:entityId',
    authenticate,
    authorize(ADMIN_ACCESS),
    (req, res) => historyController.getEntityAuditLogs(req, res)
);

/**
 * @route   GET /api/audit/user/:userId
 * @desc    Get audit logs by specific user
 * @access  Admin+ only
 * @example GET /api/audit/user/6750000000000000000000001?entityType=category
 */
router.get('/user/:userId',
    authenticate,
    authorize(ADMIN_ACCESS),
    (req, res) => historyController.getUserAuditLogs(req, res)
);

/**
 * @route   GET /api/audit/my-logs
 * @desc    Get current user's audit logs
 * @access  All authenticated users
 * @example GET /api/audit/my-logs?entityType=catalogue&limit=20
 */
router.get('/my-logs',
    authenticate,
    (req, res) => historyController.getMyAuditLogs(req, res)
);

/**
 * @route   GET /api/audit/search
 * @desc    Search audit logs with advanced filters
 * @access  Admin+ only
 * @example GET /api/audit/search?entityType=category&operation=update&startDate=2024-12-01
 */
router.get('/search',
    authenticate,
    authorize(ADMIN_ACCESS),
    (req, res) => historyController.searchAuditLogs(req, res)
);

/**
 * @route   GET /api/audit/statistics
 * @desc    Get audit statistics and analytics
 * @access  Admin+ only
 * @example GET /api/audit/statistics?entityType=catalogue&startDate=2024-12-01
 */
router.get('/statistics',
    authenticate,
    authorize(ADMIN_ACCESS),
    (req, res) => historyController.getAuditStatistics(req, res)
);

/**
 * @route   GET /api/audit/recent-activity
 * @desc    Get recent audit activity (last 24 hours)
 * @access  Admin+ only
 * @example GET /api/audit/recent-activity?limit=50
 */
router.get('/recent-activity',
    authenticate,
    authorize(ADMIN_ACCESS),
    (req, res) => historyController.getRecentActivity(req, res)
);

/**
 * @route   GET /api/audit/export
 * @desc    Export audit logs to CSV
 * @access  Super Admin only
 * @example GET /api/audit/export?startDate=2024-12-01&endDate=2024-12-17
 */
router.get('/export',
    authenticate,
    authorize(SUPER_ADMIN_ONLY),
    (req, res) => historyController.exportAuditLogsCSV(req, res)
);

export default router;