// Script to drop the old email index from fieldagents collection
// Run this with: node fix-fieldagent-index.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixFieldAgentIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('fieldagents');

    console.log('📋 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop the email_1 index
    console.log('\n🗑️  Dropping email_1 index...');
    try {
      await collection.dropIndex('email_1');
      console.log('✅ Successfully dropped email_1 index');
    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('⚠️  Index email_1 does not exist (already removed or never created)');
      } else {
        throw error;
      }
    }

    console.log('\n📋 Checking indexes after cleanup...');
    const newIndexes = await collection.indexes();
    console.log('Remaining indexes:', JSON.stringify(newIndexes, null, 2));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✨ Done!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixFieldAgentIndex();
