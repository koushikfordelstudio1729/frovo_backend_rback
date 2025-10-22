const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Frovo RBAC API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'healthy'
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    data: {
      endpoints: [
        'POST /api/auth/register - Register Super Admin',
        'POST /api/auth/login - Login',
        'GET /api/auth/me - Current User',
        'GET /api/users - List Users',
        'GET /api/roles - List Roles', 
        'GET /api/permissions - List Permissions',
        'GET /api/departments - List Departments'
      ]
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 Frovo RBAC Backend Test Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('');
  console.log('📋 Available Test Routes:');
  console.log('   🔍 Health: GET /health');
  console.log('   🧪 Test: GET /api/test');
  console.log('');
  console.log('✅ Ready to accept requests!');
  console.log('');
  console.log('🔧 Test the server:');
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl http://localhost:${PORT}/api/test`);
});

module.exports = app;