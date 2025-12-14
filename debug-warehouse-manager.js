// Script to debug warehouse manager assignment
// Run this with: node debug-warehouse-manager.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const WAREHOUSE_ID = '6939c8730a7957edc3cd6bfa'; // Your warehouse ID
const MANAGER_ID = '693934b1c2e17142793547ff'; // John's user ID

async function debugWarehouseManager() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Check if warehouse exists
    console.log('1️⃣  Checking warehouse...');
    const warehouse = await db.collection('warehouses').findOne({
      _id: new mongoose.Types.ObjectId(WAREHOUSE_ID)
    });

    if (!warehouse) {
      console.log('❌ Warehouse not found!');
      process.exit(1);
    }

    console.log('✅ Warehouse found:');
    console.log('   Name:', warehouse.name);
    console.log('   Code:', warehouse.code);
    console.log('   Manager (raw):', warehouse.manager);
    console.log('   Manager type:', typeof warehouse.manager);
    console.log('   isActive:', warehouse.isActive);
    console.log('');

    // 2. Check if user exists
    console.log('2️⃣  Checking user...');
    const user = await db.collection('users').findOne({
      _id: new mongoose.Types.ObjectId(MANAGER_ID)
    });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   _id:', user._id.toString());
    console.log('');

    // 3. Compare manager field
    console.log('3️⃣  Comparing manager field...');
    const managerString = warehouse.manager.toString();
    const userString = user._id.toString();

    console.log('   Warehouse.manager:', managerString);
    console.log('   User._id:         ', userString);
    console.log('   Match:', managerString === userString ? '✅ YES' : '❌ NO');
    console.log('');

    // 4. Try to find warehouse with manager query
    console.log('4️⃣  Testing query...');
    const foundWarehouse = await db.collection('warehouses').findOne({
      manager: new mongoose.Types.ObjectId(MANAGER_ID),
      isActive: true
    });

    if (foundWarehouse) {
      console.log('✅ Query successful! Warehouse found:', foundWarehouse.code);
    } else {
      console.log('❌ Query failed! Warehouse not found with this manager.');

      // Try without isActive
      const foundWithoutActive = await db.collection('warehouses').findOne({
        manager: new mongoose.Types.ObjectId(MANAGER_ID)
      });

      if (foundWithoutActive) {
        console.log('⚠️  Warehouse found WITHOUT isActive filter!');
        console.log('   isActive value:', foundWithoutActive.isActive);
      }
    }
    console.log('');

    // 5. List all warehouses with this manager
    console.log('5️⃣  All warehouses for this manager:');
    const allWarehouses = await db.collection('warehouses').find({
      manager: new mongoose.Types.ObjectId(MANAGER_ID)
    }).toArray();

    console.log(`   Found ${allWarehouses.length} warehouse(s)`);
    allWarehouses.forEach((wh, idx) => {
      console.log(`   ${idx + 1}. ${wh.code} - isActive: ${wh.isActive}`);
    });

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✨ Done!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugWarehouseManager();
