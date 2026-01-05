const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUrl = 'mongodb+srv://koushikpandafs_db_user:nDPsXXYHVuaigoU@cluster0.isbfyik.mongodb.net/frovo_backend_rbac?retryWrites=true&w=majority';
    await mongoose.connect(mongoUrl);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const productSchema = new mongoose.Schema({}, { strict: false });
const vendingMachineSchema = new mongoose.Schema({}, { strict: false });

const Product = mongoose.model('Product', productSchema);
const VendingMachine = mongoose.model('VendingMachine', vendingMachineSchema);

const testVendingData = async () => {
  try {
    await connectDB();

    console.log('🧪 Testing vending machine data...\n');

    // Test 1: Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products:`);
    products.slice(0, 5).forEach(product => {
      console.log(`   • ${product.name} - ₹${product.price} (${product.category})`);
    });
    if (products.length > 5) {
      console.log(`   ... and ${products.length - 5} more products`);
    }
    console.log();

    // Test 2: Get all vending machines
    const machines = await VendingMachine.find({});
    console.log(`🏪 Found ${machines.length} vending machines:`);
    machines.forEach(machine => {
      console.log(`   • ${machine.name} (${machine.machineId})`);
      console.log(`     📍 ${machine.location.address}, ${machine.location.city}, ${machine.location.state}`);
      console.log(`     🛒 ${machine.productSlots.length} product slots`);
      console.log(`     💰 Revenue: ₹${machine.revenue}, Sales: ${machine.totalSales}`);
      console.log();
    });

    // Test 3: Get machines by city
    console.log('🔍 Testing location filtering...');
    const delhiMachines = await VendingMachine.find({ 'location.city': 'Delhi' });
    console.log(`   • Found ${delhiMachines.length} machines in Delhi:`);
    delhiMachines.forEach(machine => {
      console.log(`     - ${machine.name} (${machine.machineId})`);
    });

    const mumbaiFachines = await VendingMachine.find({ 'location.city': 'Mumbai' });
    console.log(`   • Found ${mumbaiFachines.length} machines in Mumbai:`);
    mumbaiFachines.forEach(machine => {
      console.log(`     - ${machine.name} (${machine.machineId})`);
    });
    console.log();

    // Test 4: Get products in a specific machine
    const vm001 = await VendingMachine.findOne({ machineId: 'VM001' });
    if (vm001) {
      console.log(`🎯 Products in ${vm001.name} (VM001):`);
      vm001.productSlots.forEach(slot => {
        console.log(`   • Slot ${slot.slotNumber}: Product ID ${slot.product} - ₹${slot.price} (${slot.quantity}/${slot.maxCapacity} available)`);
      });
    }
    console.log();

    // Test 5: Check available products (quantity > 0)
    const availableProducts = await VendingMachine.aggregate([
      { $unwind: '$productSlots' },
      { $match: { 'productSlots.quantity': { $gt: 0 } } },
      { $group: { _id: '$machineId', availableSlots: { $sum: 1 } } }
    ]);
    
    console.log('📊 Available products by machine:');
    availableProducts.forEach(machine => {
      console.log(`   • ${machine._id}: ${machine.availableSlots} slots with products`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 API Endpoints you can test:');
    console.log('   GET /api/vending/machines - Get all machines');
    console.log('   GET /api/vending/machines/locations?city=Mumbai - Filter by city');
    console.log('   GET /api/vending/machines/VM001 - Get specific machine');
    console.log('   GET /api/vending/machines/VM001/products - Get products in machine');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing vending machine data:', error);
    process.exit(1);
  }
};

testVendingData();