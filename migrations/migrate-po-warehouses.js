// Migration script to add warehouse field to existing Purchase Orders
// Run this with: node migrate-po-warehouses.js

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const MONGODB_URI = process.env.MONGODB_URI;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migratePurchaseOrders() {
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
      rl.close();
      process.exit(0);
    }

    // 2. Get all warehouses
    console.log('🏢 Available Warehouses:');
    const warehouses = await warehousesCollection.find({ isActive: true }).toArray();

    if (warehouses.length === 0) {
      console.log('❌ No active warehouses found! Please create a warehouse first.');
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }

    warehouses.forEach((wh, idx) => {
      console.log(`   ${idx + 1}. ${wh.code} - ${wh.name} (Manager: ${wh.manager ? 'Assigned' : 'Not assigned'})`);
    });
    console.log('');

    // 3. Get migration strategy
    console.log('🔧 Migration Options:');
    console.log('   1. Assign all POs to a single warehouse');
    console.log('   2. Assign POs based on created by (user\'s assigned warehouse)');
    console.log('   3. Manual assignment (will prompt for each PO)');
    console.log('');

    const strategy = await question('Choose migration strategy (1/2/3): ');

    let updatedCount = 0;

    if (strategy === '1') {
      // Single warehouse for all
      const warehouseChoice = await question(`Choose warehouse number (1-${warehouses.length}): `);
      const selectedWarehouse = warehouses[parseInt(warehouseChoice) - 1];

      if (!selectedWarehouse) {
        console.log('❌ Invalid warehouse selection');
        process.exit(1);
      }

      console.log(`\n🔄 Updating ${posWithoutWarehouse} POs to warehouse: ${selectedWarehouse.code}...`);

      const result = await purchaseOrdersCollection.updateMany(
        { warehouse: { $exists: false } },
        { $set: { warehouse: selectedWarehouse._id } }
      );

      updatedCount = result.modifiedCount;
      console.log(`✅ Updated ${updatedCount} Purchase Orders`);

    } else if (strategy === '2') {
      // Based on created by user
      console.log('\n🔄 Analyzing POs by creator...');

      const posWithoutWh = await purchaseOrdersCollection.find({
        warehouse: { $exists: false }
      }).toArray();

      for (const po of posWithoutWh) {
        if (!po.createdBy) {
          console.log(`⚠️  PO ${po.po_number} has no creator - skipping`);
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
          console.log(`✅ PO ${po.po_number} → ${userWarehouse.code}`);
          updatedCount++;
        } else {
          // If user doesn't manage warehouse, ask
          const user = await usersCollection.findOne({ _id: po.createdBy });
          console.log(`\n⚠️  PO ${po.po_number} created by ${user ? user.name : 'Unknown'} - no warehouse assigned`);
          console.log('   Available warehouses:');
          warehouses.forEach((wh, idx) => {
            console.log(`   ${idx + 1}. ${wh.code} - ${wh.name}`);
          });

          const choice = await question(`   Assign to warehouse (1-${warehouses.length}, or 's' to skip): `);

          if (choice.toLowerCase() !== 's') {
            const selectedWarehouse = warehouses[parseInt(choice) - 1];
            if (selectedWarehouse) {
              await purchaseOrdersCollection.updateOne(
                { _id: po._id },
                { $set: { warehouse: selectedWarehouse._id } }
              );
              console.log(`   ✅ Assigned to ${selectedWarehouse.code}`);
              updatedCount++;
            }
          }
        }
      }

    } else if (strategy === '3') {
      // Manual assignment
      console.log('\n🔄 Manual assignment mode...');

      const posWithoutWh = await purchaseOrdersCollection.find({
        warehouse: { $exists: false }
      }).toArray();

      for (const po of posWithoutWh) {
        const user = await usersCollection.findOne({ _id: po.createdBy });
        console.log(`\n📦 PO: ${po.po_number}`);
        console.log(`   Created by: ${user ? user.name : 'Unknown'}`);
        console.log(`   Date: ${new Date(po.po_raised_date).toLocaleDateString()}`);
        console.log(`   Status: ${po.po_status}`);
        console.log(`   Items: ${po.po_line_items?.length || 0}`);
        console.log('\n   Available warehouses:');
        warehouses.forEach((wh, idx) => {
          console.log(`   ${idx + 1}. ${wh.code} - ${wh.name}`);
        });

        const choice = await question(`   Assign to warehouse (1-${warehouses.length}, or 's' to skip): `);

        if (choice.toLowerCase() !== 's') {
          const selectedWarehouse = warehouses[parseInt(choice) - 1];
          if (selectedWarehouse) {
            await purchaseOrdersCollection.updateOne(
              { _id: po._id },
              { $set: { warehouse: selectedWarehouse._id } }
            );
            console.log(`   ✅ Assigned to ${selectedWarehouse.code}`);
            updatedCount++;
          }
        } else {
          console.log(`   ⏭️  Skipped`);
        }
      }
    } else {
      console.log('❌ Invalid strategy selected');
      process.exit(1);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} POs`);
    console.log(`   ⏭️  Skipped: ${posWithoutWarehouse - updatedCount} POs`);

    // Verify
    const finalCount = await purchaseOrdersCollection.countDocuments({
      warehouse: { $exists: true, $ne: null }
    });
    console.log(`   📦 Total POs with warehouse: ${finalCount}/${totalPOs}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✨ Migration complete!');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

migratePurchaseOrders();
