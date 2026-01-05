const mongoose = require('mongoose');
require('dotenv').config();

async function fixVendorIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const vendorsCollection = mongoose.connection.collection('vendors');

    // List all current indexes
    console.log('📋 Current indexes on vendors collection:');
    const indexes = await vendorsCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop the problematic code_1 index
    console.log('\n🗑️  Attempting to drop "code_1" index...');
    try {
      await vendorsCollection.dropIndex('code_1');
      console.log('✅ Successfully dropped "code_1" index');
    } catch (error) {
      if (error.code === 27) {
        console.log('⚠️  Index "code_1" does not exist (already dropped or never existed)');
      } else {
        console.log('❌ Error dropping index:', error.message);
      }
    }

    // List remaining indexes
    console.log('\n📋 Remaining indexes after cleanup:');
    const remainingIndexes = await vendorsCollection.indexes();
    remainingIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Index cleanup complete!');
    console.log('🎉 You can now create vendors without the duplicate key error.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

fixVendorIndexes();
