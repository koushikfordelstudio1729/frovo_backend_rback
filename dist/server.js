"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const seeders_1 = require("./seeders");
const logger_util_1 = require("./utils/logger.util");
dotenv_1.default.config({ path: '.env' });
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));
const corsOptions = {
    origin: process.env['CORS_ORIGIN'] === '*' ? true : process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'),
    max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_util_1.logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later.'
        });
    }
});
app.use('/api/', limiter);
if (process.env['NODE_ENV'] === 'development') {
    app.use((req, _res, next) => {
        logger_util_1.logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
        next();
    });
}
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Frovo RBAC API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env['NODE_ENV'] || 'development',
        uptime: process.uptime()
    });
});
app.use('/api', routes_1.default);
app.use(errorHandler_middleware_1.notFound);
app.use(errorHandler_middleware_1.errorHandler);
const PORT = process.env['PORT'] || 3000;
process.on('uncaughtException', (error) => {
    try {
        console.error('💥 Uncaught Exception caught');
        console.error('💥 Error Type:', typeof error);
        console.error('💥 Error is null?', error === null);
        console.error('💥 Error is undefined?', error === undefined);
        if (error instanceof Error) {
            console.error('💥 Error Name:', error.name || 'NO_NAME');
            console.error('💥 Error Message:', error.message || 'NO_MESSAGE');
            console.error('💥 Error Stack:', error.stack || 'NO_STACK');
        }
        else if (error) {
            console.error('💥 Non-Error Exception:', String(error));
        }
        else {
            console.error('💥 Error is null or undefined');
        }
    }
    catch (logError) {
        console.error('Failed to log uncaught exception:', logError);
        console.error('Original error:', error);
    }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    try {
        console.error('💥 Unhandled Rejection at:', promise);
        console.error('💥 Rejection reason:', reason);
        console.error('💥 Reason type:', typeof reason);
        if (reason instanceof Error) {
            console.error('💥 Rejection stack:', reason.stack);
        }
    }
    catch (logError) {
        console.error('Failed to log unhandled rejection:', logError);
    }
    process.exit(1);
});
const startServer = async () => {
    try {
        logger_util_1.logger.info('🔌 Connecting to MongoDB...');
        await (0, database_1.connectDB)();
        if (process.env['SEED_DATABASE'] === 'true') {
            logger_util_1.logger.info('🌱 Seeding database...');
            await (0, seeders_1.seedDatabase)();
            logger_util_1.logger.info('✅ Seeding completed, starting server...');
        }
        logger_util_1.logger.info('🚀 About to start listening on port', PORT);
        const server = app.listen(PORT, () => {
            logger_util_1.logger.info('🚀 Frovo RBAC Backend Server Started');
            logger_util_1.logger.info(`📡 Server running on port ${PORT}`);
            logger_util_1.logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
            logger_util_1.logger.info(`📊 Database: ${process.env['MONGODB_URI'] ? 'Connected' : 'Not configured'}`);
            logger_util_1.logger.info(`🔐 JWT Access Secret: ${process.env['JWT_ACCESS_SECRET'] ? 'Configured' : 'Not configured'}`);
            logger_util_1.logger.info(`🔑 JWT Refresh Secret: ${process.env['JWT_REFRESH_SECRET'] ? 'Configured' : 'Not configured'}`);
            logger_util_1.logger.info('');
            logger_util_1.logger.info('📋 Available Routes:');
            logger_util_1.logger.info('   🔐 Auth: /api/auth');
            logger_util_1.logger.info('   👥 Users: /api/users');
            logger_util_1.logger.info('   🎭 Roles: /api/roles');
            logger_util_1.logger.info('   🏢 Departments: /api/departments');
            logger_util_1.logger.info('   🔑 Permissions: /api/permissions');
            logger_util_1.logger.info('   📝 Access Requests: /api/access-requests');
            logger_util_1.logger.info('   📋 Audit Logs: /api/audit-logs');
            logger_util_1.logger.info('   🔒 Security: /api/security');
            logger_util_1.logger.info('   🏭 Warehouse: /api/warehouse');
            logger_util_1.logger.info('   🛒 Vendors: /api/vendors');
            logger_util_1.logger.info('   📦Audit Trails :/api/audit-trails');
            logger_util_1.logger.info('   🗺️ Area Routes: /api/area-route');
            logger_util_1.logger.info('   🏪 Vending Machines: /api/vending');
            logger_util_1.logger.info('   📦 Catalogue: /api/catalogue');
            logger_util_1.logger.info('   🛍️ History Catalogue: /api/history-catalogue');
            logger_util_1.logger.info('');
            logger_util_1.logger.info('✅ Ready to accept requests!');
        });
        const gracefulShutdown = (signal) => {
            logger_util_1.logger.info(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
            server.close(async () => {
                logger_util_1.logger.info('🔌 HTTP server closed');
                try {
                    const mongoose = await Promise.resolve().then(() => __importStar(require('mongoose')));
                    await mongoose.default.connection.close();
                    logger_util_1.logger.info('🗄️ Database connection closed');
                    logger_util_1.logger.info('✅ Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    logger_util_1.logger.error('❌ Error during shutdown:', error);
                    process.exit(1);
                }
            });
            setTimeout(() => {
                logger_util_1.logger.error('💥 Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        logger_util_1.logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
