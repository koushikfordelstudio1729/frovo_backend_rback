// Script to add missing warehouse permissions to the database
// Run this with: node add-warehouse-permissions.js

require('dotenv').config();
const mongoose = require('mongoose');

// Get MongoDB connection string from .env
const MONGODB_URI = process.env.MONGODB_URI;

const warehousePermissions = [
  // Warehouse Management
  { key: 'warehouse:view', module: 'warehouse', action: 'view', description: 'View warehouse operations', group: 'Warehouse' },
  { key: 'warehouse:manage', module: 'warehouse', action: 'manage', description: 'Manage warehouse operations', group: 'Warehouse' },
  { key: 'warehouse:admin', module: 'warehouse', action: 'admin', description: 'Full warehouse administration', group: 'Warehouse' },

  // Purchase Orders
  { key: 'purchase_orders:view', module: 'purchase_orders', action: 'view', description: 'View purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:create', module: 'purchase_orders', action: 'create', description: 'Create purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:edit', module: 'purchase_orders', action: 'edit', description: 'Edit purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:delete', module: 'purchase_orders', action: 'delete', description: 'Delete purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:status_update', module: 'purchase_orders', action: 'status_update', description: 'Update purchase order status', group: 'Purchase Orders' },

  // GRN (Goods Received Note)
  { key: 'grn:view', module: 'grn', action: 'view', description: 'View GRN records', group: 'GRN' },
  { key: 'grn:create', module: 'grn', action: 'create', description: 'Create GRN records', group: 'GRN' },
  { key: 'grn:edit', module: 'grn', action: 'edit', description: 'Edit GRN records', group: 'GRN' },
  { key: 'grn:delete', module: 'grn', action: 'delete', description: 'Delete GRN records', group: 'GRN' },

  // Additional Warehouse Permissions
  { key: 'inventory:view', module: 'inventory', action: 'view', description: 'View inventory', group: 'Inventory' },
  { key: 'inventory:manage', module: 'inventory', action: 'manage', description: 'Manage inventory', group: 'Inventory' },
  { key: 'dispatch:view', module: 'dispatch', action: 'view', description: 'View dispatch orders', group: 'Inventory' },
  { key: 'expenses:view', module: 'expenses', action: 'view', description: 'View expenses', group: 'Warehouse' },
  { key: 'expenses:create', module: 'expenses', action: 'create', description: 'Create expenses', group: 'Warehouse' },
  { key: 'expenses:manage', module: 'expenses', action: 'manage', description: 'Manage expenses', group: 'Warehouse' },
  { key: 'expenses:approve', module: 'expenses', action: 'approve', description: 'Approve expenses', group: 'Warehouse' },
  { key: 'agents:view', module: 'agents', action: 'view', description: 'View field agents', group: 'Warehouse' },
  { key: 'agents:manage', module: 'agents', action: 'manage', description: 'Manage field agents', group: 'Warehouse' },
  { key: 'qc:view', module: 'qc', action: 'view', description: 'View QC templates', group: 'Warehouse' },
  { key: 'qc:manage', module: 'qc', action: 'manage', description: 'Manage QC templates', group: 'Warehouse' },
  { key: 'returns:view', module: 'returns', action: 'view', description: 'View return orders', group: 'Warehouse' },
  { key: 'returns:manage', module: 'returns', action: 'manage', description: 'Manage return orders', group: 'Warehouse' },
  { key: 'reports:view', module: 'reports', action: 'view', description: 'View reports', group: 'Warehouse' },
  { key: 'reports:export', module: 'reports', action: 'export', description: 'Export reports', group: 'Warehouse' }
];

async function addWarehousePermissions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Permission = mongoose.model('Permission', new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      module: { type: String, required: true },
      action: { type: String, required: true },
      description: String,
      group: String
    }, { timestamps: true }));

    console.log('📝 Adding warehouse permissions...');

    let addedCount = 0;
    let skippedCount = 0;

    for (const permission of warehousePermissions) {
      try {
        const existing = await Permission.findOne({ key: permission.key });
        if (existing) {
          console.log(`⏭️  Skipped: ${permission.key} (already exists)`);
          skippedCount++;
        } else {
          await Permission.create(permission);
          console.log(`✅ Added: ${permission.key}`);
          addedCount++;
        }
      } catch (error) {
        console.error(`❌ Error adding ${permission.key}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${addedCount} permissions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} permissions (already existed)`);
    console.log(`   📝 Total: ${warehousePermissions.length} permissions`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✨ Done!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addWarehousePermissions();
