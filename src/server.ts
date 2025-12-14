import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler.middleware';
import { seedDatabase } from './seeders';
import { logger } from './utils/logger.util';

// Load environment variables
dotenv.config({ path: '.env' });

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env['CORS_ORIGIN'] === '*' ? true : process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'), // 1 minute
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'), // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

app.use('/api/', limiter);

// Request logging middleware (development only)
if (process.env['NODE_ENV'] === 'development') {
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
    next();
  });
}

// Health check endpoint
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

// API routes
app.use('/api', routes);

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env['PORT'] || 3000;

// Set up error handlers FIRST, before any async operations
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
    } else if (error) {
      console.error('💥 Non-Error Exception:', String(error));
    } else {
      console.error('💥 Error is null or undefined');
    }
  } catch (logError) {
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
  } catch (logError) {
    console.error('Failed to log unhandled rejection:', logError);
  }
  process.exit(1);
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    logger.info('🔌 Connecting to MongoDB...');
    await connectDB();
    
    // Run seeders if enabled
    if (process.env['SEED_DATABASE'] === 'true') {
      logger.info('🌱 Seeding database...');
      await seedDatabase();
      logger.info('✅ Seeding completed, starting server...');
    }
    
    // Start the server
    logger.info('🚀 About to start listening on port', PORT);
    const server = app.listen(PORT, () => {
      logger.info('🚀 Frovo RBAC Backend Server Started');
      logger.info(`📡 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      logger.info(`📊 Database: ${process.env['MONGODB_URI'] ? 'Connected' : 'Not configured'}`);
      logger.info(`🔐 JWT Access Secret: ${process.env['JWT_ACCESS_SECRET'] ? 'Configured' : 'Not configured'}`);
      logger.info(`🔑 JWT Refresh Secret: ${process.env['JWT_REFRESH_SECRET'] ? 'Configured' : 'Not configured'}`);
      logger.info('');
      logger.info('📋 Available Routes:');
      logger.info('   🔐 Auth: /api/auth');
      logger.info('   👥 Users: /api/users');
      logger.info('   🎭 Roles: /api/roles');
      logger.info('   🏢 Departments: /api/departments');
      logger.info('   🔑 Permissions: /api/permissions');
      logger.info('   📝 Access Requests: /api/access-requests');
      logger.info('   📋 Audit Logs: /api/audit-logs');
      logger.info('   🔒 Security: /api/security');
      logger.info('   🏭 Warehouse: /api/warehouse');
      logger.info('   🛒 Vendors: /api/vendors');
      logger.info('   📦Audit Trails :/api/audit-trails');
      logger.info('   🗺️ Area Routes: /api/area-route');
      logger.info('   🏪 Vending Machines: /api/vending');
      logger.info('');
      logger.info('✅ Ready to accept requests!');
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('🔌 HTTP server closed');
        
        try {
          // Close database connection
          const mongoose = await import('mongoose');
          await mongoose.default.connection.close();
          logger.info('🗄️ Database connection closed');
          
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('💥 Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };
    
    // Handle process termination
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;