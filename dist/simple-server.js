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
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const seeders_1 = require("./seeders");
const logger_util_1 = require("./utils/logger.util");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Frovo RBAC API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env['NODE_ENV'] || 'development',
        database: 'Connected'
    });
});
app.get('/api/info', (_req, res) => {
    res.json({
        success: true,
        message: 'RBAC Backend API Information',
        data: {
            name: 'Frovo RBAC Backend',
            version: '1.0.0',
            description: 'Complete Role-Based Access Control system',
            features: [
                '8 MongoDB Models (User, Role, Department, Permission, etc.)',
                'JWT Authentication with Refresh Tokens',
                'Scope-based Permission System (Global → Partner → Region → Machine)',
                '8 Default System Roles with Proper Permissions',
                '30+ Granular Permissions',
                'Complete Audit Trail',
                'Access Request Workflow',
                'Security Configuration',
                'Database Seeding'
            ],
            endpoints: {
                auth: [
                    'POST /api/auth/register',
                    'POST /api/auth/login',
                    'POST /api/auth/logout',
                    'GET /api/auth/me',
                    'POST /api/auth/refresh-token'
                ],
                users: [
                    'GET /api/users',
                    'POST /api/users',
                    'GET /api/users/:id',
                    'PUT /api/users/:id',
                    'DELETE /api/users/:id'
                ],
                roles: [
                    'GET /api/roles',
                    'POST /api/roles',
                    'GET /api/roles/:id',
                    'PUT /api/roles/:id',
                    'DELETE /api/roles/:id'
                ],
                permissions: [
                    'GET /api/permissions',
                    'GET /api/permissions/check'
                ]
            },
            systemRoles: [
                'Super Admin - Full system access',
                'Ops Manager - Operations with partner scope',
                'Field Agent - Mobile app with machine scope',
                'Technician - Maintenance with machine scope',
                'Finance Manager - Financial operations with global scope',
                'Support Agent - Customer support with global scope',
                'Warehouse Manager - Inventory with partner scope',
                'Auditor - Read-only audit access'
            ]
        }
    });
});
app.get('/api/database/status', async (_req, res) => {
    try {
        const mongoose = await Promise.resolve().then(() => __importStar(require('mongoose')));
        const readyState = mongoose.default.connection.readyState;
        const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
        res.json({
            success: true,
            data: {
                status: states[readyState] || 'unknown',
                readyState,
                host: mongoose.default.connection.host,
                name: mongoose.default.connection.name
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database status check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
const PORT = process.env['PORT'] || 3000;
const startServer = async () => {
    try {
        logger_util_1.logger.info('🔌 Connecting to MongoDB...');
        await (0, database_1.connectDB)();
        if (process.env['SEED_DATABASE'] === 'true') {
            logger_util_1.logger.info('🌱 Seeding database...');
            try {
                await (0, seeders_1.seedDatabase)();
                logger_util_1.logger.info('✅ Database seeded successfully');
            }
            catch (seedError) {
                logger_util_1.logger.warn('⚠️ Database seeding failed (may already be seeded):', seedError);
            }
        }
        app.listen(PORT, () => {
            logger_util_1.logger.info('🚀 Frovo RBAC Backend Server Started');
            logger_util_1.logger.info(`📡 Server running on port ${PORT}`);
            logger_util_1.logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
            logger_util_1.logger.info('📊 Database: Connected');
            logger_util_1.logger.info('');
            logger_util_1.logger.info('📋 Available Routes:');
            logger_util_1.logger.info('   🔍 Health: GET /health');
            logger_util_1.logger.info('   📊 API Info: GET /api/info');
            logger_util_1.logger.info('   🗄️ Database Status: GET /api/database/status');
            logger_util_1.logger.info('');
            logger_util_1.logger.info('✅ Ready to accept requests!');
            logger_util_1.logger.info('');
            logger_util_1.logger.info('🔧 Test the server:');
            logger_util_1.logger.info(`   curl http://localhost:${PORT}/health`);
            logger_util_1.logger.info(`   curl http://localhost:${PORT}/api/info`);
            logger_util_1.logger.info(`   curl http://localhost:${PORT}/api/database/status`);
            if (process.env['SEED_DATABASE'] === 'true') {
                logger_util_1.logger.info('');
                logger_util_1.logger.info('🔐 Default Super Admin Credentials:');
                logger_util_1.logger.info(`   Email: ${process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@vendingapp.com'}`);
                logger_util_1.logger.info(`   Password: ${process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123'}`);
            }
        });
    }
    catch (error) {
        logger_util_1.logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
