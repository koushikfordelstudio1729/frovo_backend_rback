// Automated Migration script to add warehouse field to existing Purchase Orders
// This version runs without user interaction
// Run this with: node auto-migrate-po-warehouses.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function autoMigratePurchaseOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const purchaseOrdersCollection = db.collection('raisepurchaseorders');
    const warehousesCollection = db.collection('warehouses');
    const usersCollection = db.collection('users');

    // 1. Check how many POs need migration
    console.log('📊 Checking Purchase Orders...');
    const totalPOs = await purchaseOrdersCollection.countDocuments({});
    const posWithWarehouse = await purchaseOrdersCollection.countDocuments({
      warehouse: { $exists: true, $ne: null }
    });
    const posWithoutWarehouse = totalPOs - posWithWarehouse;

    console.log(`   Total POs: ${totalPOs}`);
    console.log(`   ✅ With warehouse: ${posWithWarehouse}`);
    console.log(`   ⚠️  Without warehouse: ${posWithoutWarehouse}\n`);

    if (posWithoutWarehouse === 0) {
      console.log('🎉 All Purchase Orders already have warehouse assigned!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // 2. Get all warehouses
    console.log('🏢 Available Warehouses:');
    const warehouses = await warehousesCollection.find({ isActive: true }).toArray();

    if (warehouses.length === 0) {
      console.log('❌ No active warehouses found! Please create a warehouse first.');
      await mongoose.disconnect();
      process.exit(1);
    }

    warehouses.forEach((wh, idx) => {
      console.log(`   ${idx + 1}. ${wh.code} - ${wh.name}`);
      console.log(`      Manager: ${wh.manager || 'Not assigned'}`);
    });
    console.log('');

    // 3. Auto-migration strategy: Based on created by user's assigned warehouse
    console.log('🔧 Using Strategy: Auto-assign based on PO creator\'s assigned warehouse');
    console.log('   (If creator has no warehouse, use first available warehouse)\n');

    console.log('🔄 Processing Purchase Orders...\n');

    const posWithoutWh = await purchaseOrdersCollection.find({
      warehouse: { $exists: false }
    }).toArray();

    let updatedCount = 0;
    let autoAssignedCount = 0;
    let skippedCount = 0;

    // Get first warehouse as fallback
    const fallbackWarehouse = warehouses[0];

    for (const po of posWithoutWh) {
      if (!po.createdBy) {
        console.log(`⚠️  PO ${po.po_number} - No creator, assigning to ${fallbackWarehouse.code}`);
        await purchaseOrdersCollection.updateOne(
          { _id: po._id },
          { $set: { warehouse: fallbackWarehouse._id } }
        );
        autoAssignedCount++;
        updatedCount++;
        continue;
      }

      // Find warehouse managed by this user
      const userWarehouse = await warehousesCollection.findOne({
        manager: po.createdBy,
        isActive: true
      });

      if (userWarehouse) {
        await purchaseOrdersCollection.updateOne(
          { _id: po._id },
          { $set: { warehouse: userWarehouse._id } }
        );
        const user = await usersCollection.findOne({ _id: po.createdBy });
        console.log(`✅ PO ${po.po_number} → ${userWarehouse.code} (Creator: ${user?.name || 'Unknown'})`);
        updatedCount++;
      } else {
        // Creator doesn't manage a warehouse, use fallback
        await purchaseOrdersCollection.updateOne(
          { _id: po._id },
          { $set: { warehouse: fallbackWarehouse._id } }
        );
        const user = await usersCollection.findOne({ _id: po.createdBy });
        console.log(`⚠️  PO ${po.po_number} → ${fallbackWarehouse.code} (Fallback - Creator: ${user?.name || 'Unknown'})`);
        autoAssignedCount++;
        updatedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`   ✅ Assigned to creator's warehouse: ${updatedCount - autoAssignedCount}`);
    console.log(`   ⚠️  Auto-assigned (fallback):        ${autoAssignedCount}`);
    console.log(`   ⏭️  Skipped:                         ${skippedCount}`);
    console.log(`   📦 Total updated:                   ${updatedCount}/${posWithoutWarehouse}`);

    // Verify
    const finalCount = await purchaseOrdersCollection.countDocuments({
      warehouse: { $exists: true, $ne: null }
    });
    console.log(`\n   ✨ Final status: ${finalCount}/${totalPOs} POs have warehouse assigned`);
    console.log('='.repeat(60));

    // Show warehouse distribution
    console.log('\n📊 Warehouse Distribution:');
    for (const wh of warehouses) {
      const count = await purchaseOrdersCollection.countDocuments({
        warehouse: wh._id
      });
      console.log(`   ${wh.code}: ${count} POs`);
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✨ Migration complete!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Purchase Order Warehouse Auto-Migration Script          ║');
console.log('║   This will automatically assign warehouses to POs         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

autoMigratePurchaseOrders();
