"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditReject = exports.auditApprove = exports.auditRemove = exports.auditAssign = exports.auditLogout = exports.auditLogin = exports.auditDelete = exports.auditUpdate = exports.auditCreate = exports.auditLog = void 0;
const models_1 = require("../models");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const logger_util_1 = require("../utils/logger.util");
const auditLog = (options) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        const originalJson = res.json.bind(res);
        let responseData = null;
        let requestData = null;
        if (options.captureRequest) {
            requestData = {
                body: req.body,
                query: req.query,
                params: req.params
            };
        }
        res.json = function (data) {
            responseData = data;
            return originalJson(data);
        };
        res.on('finish', async () => {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                    const auditData = {
                        timestamp: new Date(),
                        actor: req.user._id,
                        action: options.action,
                        module: options.module,
                        ipAddress: req.clientIp,
                        userAgent: req.userAgent
                    };
                    if (options.getTarget) {
                        auditData.target = options.getTarget(req, res);
                    }
                    else if (req.params['id']) {
                        auditData.target = {
                            type: options.module,
                            id: req.params['id']
                        };
                    }
                    if (options.action.includes('update') || options.action.includes('edit')) {
                        if (options.captureRequest && options.captureResponse) {
                            auditData.changes = {
                                before: responseData?.data?.before || null,
                                after: responseData?.data || requestData?.body || null
                            };
                        }
                    }
                    auditData.metadata = {
                        method: req.method,
                        url: req.originalUrl,
                        statusCode: res.statusCode
                    };
                    await models_1.AuditLog.create(auditData);
                    if (process.env['NODE_ENV'] === 'development') {
                        logger_util_1.logger.audit(options.action, req.user?.email || req.user?._id.toString(), auditData.target?.type || options.module, auditData);
                    }
                }
            }
            catch (error) {
                logger_util_1.logger.error('Audit logging failed:', error);
            }
        });
        return next();
    });
};
exports.auditLog = auditLog;
const auditCreate = (module, getTarget) => {
    const options = {
        action: 'create',
        module,
        captureRequest: true,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditCreate = auditCreate;
const auditUpdate = (module, getTarget) => {
    const options = {
        action: 'update',
        module,
        captureRequest: true,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditUpdate = auditUpdate;
const auditDelete = (module, getTarget) => {
    const options = {
        action: 'delete',
        module,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditDelete = auditDelete;
const auditLogin = () => {
    return (0, exports.auditLog)({
        action: 'login',
        module: 'Auth',
        captureResponse: true
    });
};
exports.auditLogin = auditLogin;
const auditLogout = () => {
    return (0, exports.auditLog)({
        action: 'logout',
        module: 'Auth'
    });
};
exports.auditLogout = auditLogout;
const auditAssign = (module, getTarget) => {
    const options = {
        action: 'assign',
        module,
        captureRequest: true,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditAssign = auditAssign;
const auditRemove = (module, getTarget) => {
    const options = {
        action: 'remove',
        module,
        captureRequest: true,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditRemove = auditRemove;
const auditApprove = (module, getTarget) => {
    const options = {
        action: 'approve',
        module,
        captureRequest: true,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditApprove = auditApprove;
const auditReject = (module, getTarget) => {
    const options = {
        action: 'reject',
        module,
        captureRequest: true,
        captureResponse: true
    };
    if (getTarget) {
        options.getTarget = getTarget;
    }
    return (0, exports.auditLog)(options);
};
exports.auditReject = auditReject;
//# sourceMappingURL=auditLog.middleware.js.map