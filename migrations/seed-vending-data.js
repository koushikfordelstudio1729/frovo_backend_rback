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

// Define schemas
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  brand: String,
  imageUrl: String,
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    sugar: Number,
    sodium: Number
  },
  allergens: [String],
  isActive: { type: Boolean, default: true },
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const vendingMachineSchema = new mongoose.Schema({
  machineId: String,
  name: String,
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    latitude: Number,
    longitude: Number,
    landmark: String
  },
  status: { type: String, default: 'Active' },
  machineModel: String,
  manufacturer: String,
  installationDate: Date,
  lastMaintenanceDate: Date,
  productSlots: [{
    slotNumber: String,
    product: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    maxCapacity: Number,
    price: Number
  }],
  paymentMethods: [String],
  operatingHours: {
    openTime: String,
    closeTime: String,
    isAlwaysOpen: Boolean
  },
  temperature: Number,
  capacity: Number,
  revenue: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  isOnline: { type: Boolean, default: true },
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const VendingMachine = mongoose.model('VendingMachine', vendingMachineSchema);

const seedVendingData = async () => {
  try {
    await connectDB();

    // Check if products already exist
    let productCount = await Product.countDocuments();
    console.log(`Found ${productCount} existing products`);
    
    let productMap = {};
    
    if (productCount === 0) {
      console.log('🌱 Seeding products...');
      
      const products = [
        // Beverages
        {
          name: 'Coca-Cola',
          description: 'Classic cola soft drink',
          price: 25,
          category: 'Beverages',
          brand: 'Coca-Cola',
          nutritionInfo: { calories: 139, carbs: 37, sugar: 37, sodium: 9 },
          isActive: true
        },
        {
          name: 'Pepsi',
          description: 'Cola soft drink',
          price: 25,
          category: 'Beverages',
          brand: 'PepsiCo',
          nutritionInfo: { calories: 150, carbs: 41, sugar: 41, sodium: 20 },
          isActive: true
        },
        {
          name: 'Sprite',
          description: 'Lemon-lime flavored soft drink',
          price: 25,
          category: 'Beverages',
          brand: 'Coca-Cola',
          nutritionInfo: { calories: 140, carbs: 38, sugar: 38, sodium: 40 },
          isActive: true
        },
        {
          name: 'Mountain Dew',
          description: 'Citrus flavored soft drink',
          price: 30,
          category: 'Energy Drinks',
          brand: 'PepsiCo',
          nutritionInfo: { calories: 170, carbs: 46, sugar: 46, sodium: 60 },
          isActive: true
        },
        {
          name: 'Red Bull',
          description: 'Energy drink with caffeine',
          price: 120,
          category: 'Energy Drinks',
          brand: 'Red Bull',
          nutritionInfo: { calories: 110, carbs: 27, sugar: 27, sodium: 105 },
          isActive: true
        },
        {
          name: 'Bisleri Water',
          description: 'Packaged drinking water',
          price: 20,
          category: 'Water',
          brand: 'Bisleri',
          nutritionInfo: { calories: 0, carbs: 0, sugar: 0, sodium: 0 },
          isActive: true
        },
        {
          name: 'Aquafina',
          description: 'Purified drinking water',
          price: 20,
          category: 'Water',
          brand: 'PepsiCo',
          nutritionInfo: { calories: 0, carbs: 0, sugar: 0, sodium: 0 },
          isActive: true
        },
        {
          name: 'Nescafe Cold Coffee',
          description: 'Ready to drink cold coffee',
          price: 35,
          category: 'Coffee',
          brand: 'Nestle',
          nutritionInfo: { calories: 120, protein: 3, carbs: 20, sugar: 18, fat: 3 },
          isActive: true
        },
        {
          name: 'Lays Classic',
          description: 'Classic potato chips',
          price: 20,
          category: 'Chips',
          brand: 'Lays',
          nutritionInfo: { calories: 160, protein: 2, carbs: 15, fat: 10, sodium: 170 },
          allergens: ['Gluten'],
          isActive: true
        },
        {
          name: 'Kurkure',
          description: 'Spicy corn puff snacks',
          price: 20,
          category: 'Snacks',
          brand: 'PepsiCo',
          nutritionInfo: { calories: 150, protein: 2, carbs: 16, fat: 9, sodium: 180 },
          isActive: true
        },
        {
          name: 'Bingo Mad Angles',
          description: 'Triangular corn chips',
          price: 20,
          category: 'Chips',
          brand: 'Bingo',
          nutritionInfo: { calories: 140, protein: 2, carbs: 18, fat: 7, sodium: 150 },
          isActive: true
        },
        {
          name: 'Parle-G Biscuits',
          description: 'Glucose biscuits',
          price: 10,
          category: 'Snacks',
          brand: 'Parle',
          nutritionInfo: { calories: 130, protein: 3, carbs: 22, fat: 4, sugar: 8 },
          allergens: ['Gluten'],
          isActive: true
        },
        {
          name: 'Oreo Cookies',
          description: 'Chocolate sandwich cookies',
          price: 30,
          category: 'Candy',
          brand: 'Mondelez',
          nutritionInfo: { calories: 160, protein: 2, carbs: 25, fat: 7, sugar: 14 },
          allergens: ['Gluten', 'Dairy'],
          isActive: true
        },
        {
          name: 'Mixed Nuts',
          description: 'Roasted mixed nuts pack',
          price: 50,
          category: 'Healthy',
          nutritionInfo: { calories: 180, protein: 6, carbs: 6, fat: 16, sodium: 90 },
          allergens: ['Nuts'],
          isActive: true
        },
        {
          name: 'Granola Bar',
          description: 'Oats and nuts energy bar',
          price: 40,
          category: 'Healthy',
          nutritionInfo: { calories: 150, protein: 4, carbs: 22, fat: 6, sugar: 12 },
          allergens: ['Nuts', 'Gluten'],
          isActive: true
        },
        {
          name: 'Dairy Milk Chocolate',
          description: 'Milk chocolate bar',
          price: 40,
          category: 'Candy',
          brand: 'Cadbury',
          nutritionInfo: { calories: 200, protein: 3, carbs: 24, fat: 11, sugar: 23 },
          allergens: ['Dairy', 'Nuts'],
          isActive: true
        }
      ];

      const createdProducts = await Product.insertMany(products);
      console.log(`✅ Successfully seeded ${createdProducts.length} products`);
      
      // Create product mapping
      createdProducts.forEach(product => {
        const key = product.name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
        productMap[key] = product._id;
      });
    } else {
      console.log('✅ Products already exist, creating product map...');
      const existingProducts = await Product.find();
      existingProducts.forEach(product => {
        const key = product.name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
        productMap[key] = product._id;
      });
    }

    // Check if vending machines already exist
    let machineCount = await VendingMachine.countDocuments();
    console.log(`Found ${machineCount} existing vending machines`);
    
    if (machineCount === 0) {
      console.log('🌱 Seeding vending machines...');
      
      const machines = [
        {
          machineId: 'VM001',
          name: 'Downtown Office Complex',
          location: {
            address: 'Block A, Ground Floor, Tech Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001',
            country: 'India',
            latitude: 19.0760,
            longitude: 72.8777,
            landmark: 'Near main entrance'
          },
          status: 'Active',
          machineModel: 'VendMax Pro 3000',
          manufacturer: 'VendMax Technologies',
          installationDate: new Date('2024-01-15'),
          lastMaintenanceDate: new Date('2024-10-15'),
          productSlots: [
            { slotNumber: 'A1', product: productMap['coca_cola'], quantity: 8, maxCapacity: 10, price: 25 },
            { slotNumber: 'A2', product: productMap['pepsi'], quantity: 6, maxCapacity: 10, price: 25 },
            { slotNumber: 'A3', product: productMap['sprite'], quantity: 7, maxCapacity: 10, price: 25 },
            { slotNumber: 'A4', product: productMap['mountain_dew'], quantity: 5, maxCapacity: 8, price: 30 },
            { slotNumber: 'B1', product: productMap['bisleri_water'], quantity: 12, maxCapacity: 15, price: 20 },
            { slotNumber: 'B2', product: productMap['aquafina'], quantity: 10, maxCapacity: 15, price: 20 },
            { slotNumber: 'B3', product: productMap['red_bull'], quantity: 4, maxCapacity: 6, price: 120 },
            { slotNumber: 'B4', product: productMap['nescafe_cold_coffee'], quantity: 6, maxCapacity: 8, price: 35 },
            { slotNumber: 'C1', product: productMap['lays_classic'], quantity: 8, maxCapacity: 12, price: 20 },
            { slotNumber: 'C2', product: productMap['kurkure'], quantity: 9, maxCapacity: 12, price: 20 },
            { slotNumber: 'C3', product: productMap['oreo_cookies'], quantity: 7, maxCapacity: 10, price: 30 },
            { slotNumber: 'C4', product: productMap['dairy_milk_chocolate'], quantity: 5, maxCapacity: 8, price: 40 }
          ],
          paymentMethods: ['Cash', 'Card', 'UPI', 'Wallet'],
          operatingHours: {
            openTime: '06:00',
            closeTime: '22:00',
            isAlwaysOpen: false
          },
          temperature: 8,
          capacity: 12,
          revenue: 15750,
          totalSales: 450,
          isOnline: true
        },
        {
          machineId: 'VM002',
          name: 'University Campus - Library',
          location: {
            address: 'Central Library, 2nd Floor',
            city: 'Delhi',
            state: 'Delhi',
            zipCode: '110001',
            country: 'India',
            latitude: 28.7041,
            longitude: 77.1025,
            landmark: 'Near study hall entrance'
          },
          status: 'Active',
          machineModel: 'SmartVend 2500',
          manufacturer: 'SmartVend Solutions',
          installationDate: new Date('2024-03-10'),
          lastMaintenanceDate: new Date('2024-11-01'),
          productSlots: [
            { slotNumber: 'A1', product: productMap['bisleri_water'], quantity: 15, maxCapacity: 20, price: 20 },
            { slotNumber: 'A2', product: productMap['aquafina'], quantity: 12, maxCapacity: 20, price: 20 },
            { slotNumber: 'A3', product: productMap['nescafe_cold_coffee'], quantity: 8, maxCapacity: 10, price: 35 },
            { slotNumber: 'A4', product: productMap['red_bull'], quantity: 3, maxCapacity: 5, price: 120 },
            { slotNumber: 'B1', product: productMap['mixed_nuts'], quantity: 6, maxCapacity: 8, price: 50 },
            { slotNumber: 'B2', product: productMap['granola_bar'], quantity: 7, maxCapacity: 10, price: 40 },
            { slotNumber: 'B3', product: productMap['parle_g_biscuits'], quantity: 10, maxCapacity: 15, price: 10 },
            { slotNumber: 'B4', product: productMap['oreo_cookies'], quantity: 8, maxCapacity: 12, price: 30 }
          ],
          paymentMethods: ['Card', 'UPI', 'Wallet'],
          operatingHours: {
            openTime: '08:00',
            closeTime: '20:00',
            isAlwaysOpen: false
          },
          capacity: 8,
          revenue: 12300,
          totalSales: 380,
          isOnline: true
        },
        {
          machineId: 'VM003',
          name: 'Shopping Mall - Food Court',
          location: {
            address: 'Food Court, Level 2, Phoenix Mall',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560001',
            country: 'India',
            latitude: 12.9716,
            longitude: 77.5946,
            landmark: 'Near KFC counter'
          },
          status: 'Active',
          machineModel: 'MegaVend 4000',
          manufacturer: 'MegaVend Corp',
          installationDate: new Date('2023-12-01'),
          lastMaintenanceDate: new Date('2024-10-30'),
          productSlots: [
            { slotNumber: 'A1', product: productMap['coca_cola'], quantity: 10, maxCapacity: 12, price: 30 },
            { slotNumber: 'A2', product: productMap['pepsi'], quantity: 8, maxCapacity: 12, price: 30 },
            { slotNumber: 'A3', product: productMap['sprite'], quantity: 9, maxCapacity: 12, price: 30 },
            { slotNumber: 'A4', product: productMap['mountain_dew'], quantity: 7, maxCapacity: 10, price: 35 },
            { slotNumber: 'B1', product: productMap['lays_classic'], quantity: 12, maxCapacity: 15, price: 25 },
            { slotNumber: 'B2', product: productMap['kurkure'], quantity: 11, maxCapacity: 15, price: 25 },
            { slotNumber: 'B3', product: productMap['bingo_mad_angles'], quantity: 10, maxCapacity: 15, price: 25 },
            { slotNumber: 'B4', product: productMap['oreo_cookies'], quantity: 8, maxCapacity: 12, price: 35 },
            { slotNumber: 'C1', product: productMap['dairy_milk_chocolate'], quantity: 6, maxCapacity: 10, price: 45 },
            { slotNumber: 'C2', product: productMap['red_bull'], quantity: 5, maxCapacity: 8, price: 130 }
          ],
          paymentMethods: ['Cash', 'Card', 'UPI'],
          operatingHours: {
            openTime: '10:00',
            closeTime: '22:00',
            isAlwaysOpen: false
          },
          temperature: 6,
          capacity: 10,
          revenue: 21500,
          totalSales: 620,
          isOnline: true
        },
        {
          machineId: 'VM004',
          name: 'Metro Station - Platform 2',
          location: {
            address: 'Platform 2, Rajiv Chowk Metro Station',
            city: 'Delhi',
            state: 'Delhi',
            zipCode: '110001',
            country: 'India',
            latitude: 28.6328,
            longitude: 77.2197,
            landmark: 'Near escalator'
          },
          status: 'Active',
          machineModel: 'QuickVend Express',
          manufacturer: 'QuickVend Inc',
          installationDate: new Date('2024-02-20'),
          productSlots: [
            { slotNumber: 'A1', product: productMap['bisleri_water'], quantity: 18, maxCapacity: 25, price: 25 },
            { slotNumber: 'A2', product: productMap['aquafina'], quantity: 15, maxCapacity: 25, price: 25 },
            { slotNumber: 'B1', product: productMap['coca_cola'], quantity: 12, maxCapacity: 15, price: 30 },
            { slotNumber: 'B2', product: productMap['pepsi'], quantity: 10, maxCapacity: 15, price: 30 },
            { slotNumber: 'C1', product: productMap['parle_g_biscuits'], quantity: 20, maxCapacity: 25, price: 12 },
            { slotNumber: 'C2', product: productMap['lays_classic'], quantity: 15, maxCapacity: 20, price: 25 }
          ],
          paymentMethods: ['UPI', 'Card'],
          operatingHours: {
            openTime: '05:00',
            closeTime: '00:00',
            isAlwaysOpen: false
          },
          capacity: 6,
          revenue: 8900,
          totalSales: 290,
          isOnline: true
        },
        {
          machineId: 'VM005',
          name: 'Hospital - Main Lobby',
          location: {
            address: 'Main Lobby, Apollo Hospital',
            city: 'Chennai',
            state: 'Tamil Nadu',
            zipCode: '600006',
            country: 'India',
            latitude: 13.0827,
            longitude: 80.2707,
            landmark: 'Near reception desk'
          },
          status: 'Active',
          machineModel: 'HealthVend 2000',
          manufacturer: 'HealthVend Systems',
          installationDate: new Date('2024-01-05'),
          lastMaintenanceDate: new Date('2024-10-20'),
          productSlots: [
            { slotNumber: 'A1', product: productMap['bisleri_water'], quantity: 20, maxCapacity: 25, price: 20 },
            { slotNumber: 'A2', product: productMap['aquafina'], quantity: 18, maxCapacity: 25, price: 20 },
            { slotNumber: 'B1', product: productMap['mixed_nuts'], quantity: 8, maxCapacity: 10, price: 50 },
            { slotNumber: 'B2', product: productMap['granola_bar'], quantity: 10, maxCapacity: 12, price: 40 },
            { slotNumber: 'C1', product: productMap['nescafe_cold_coffee'], quantity: 6, maxCapacity: 8, price: 35 },
            { slotNumber: 'C2', product: productMap['parle_g_biscuits'], quantity: 12, maxCapacity: 15, price: 10 }
          ],
          paymentMethods: ['Card', 'UPI', 'Wallet'],
          operatingHours: {
            openTime: '00:00',
            closeTime: '23:59',
            isAlwaysOpen: true
          },
          capacity: 6,
          revenue: 9800,
          totalSales: 320,
          isOnline: true
        }
      ];

      const createdMachines = await VendingMachine.insertMany(machines);
      console.log(`✅ Successfully seeded ${createdMachines.length} vending machines`);
    } else {
      console.log('✅ Vending machines already exist');
    }

    console.log('🎉 Vending machine data seeding completed successfully!');
    
    // Show final counts
    const finalProductCount = await Product.countDocuments();
    const finalMachineCount = await VendingMachine.countDocuments();
    
    console.log(`📊 Final counts:`);
    console.log(`   • Products: ${finalProductCount}`);
    console.log(`   • Vending Machines: ${finalMachineCount}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding vending machine data:', error);
    process.exit(1);
  }
};

seedVendingData();