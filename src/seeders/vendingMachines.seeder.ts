import { VendingMachine } from '../models';
import { logger } from '../utils/logger.util';
import { Types } from 'mongoose';

export const seedVendingMachines = async (
  createdBy: Types.ObjectId | null = null,
  productMap: { [key: string]: Types.ObjectId }
): Promise<{ [key: string]: Types.ObjectId }> => {
  try {
    logger.info('🌱 Seeding vending machines...');
    
    // Check if vending machines already exist
    const existingCount = await VendingMachine.countDocuments();
    if (existingCount > 0) {
      logger.info(`✅ Vending machines already seeded (${existingCount} machines found)`);
      
      // Return existing machine IDs
      const existingMachines = await VendingMachine.find();
      const machineMap: { [key: string]: Types.ObjectId } = {};
      existingMachines.forEach(machine => {
        machineMap[machine.machineId] = machine._id;
      });
      return machineMap;
    }
    
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
          { slotNumber: 'A1', product: productMap['coca-cola'], quantity: 8, maxCapacity: 10, price: 25 },
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
          { slotNumber: 'B3', product: productMap['parle-g_biscuits'], quantity: 10, maxCapacity: 15, price: 10 },
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
          { slotNumber: 'A1', product: productMap['coca-cola'], quantity: 10, maxCapacity: 12, price: 30 },
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
          { slotNumber: 'B1', product: productMap['coca-cola'], quantity: 12, maxCapacity: 15, price: 30 },
          { slotNumber: 'B2', product: productMap['pepsi'], quantity: 10, maxCapacity: 15, price: 30 },
          { slotNumber: 'C1', product: productMap['parle-g_biscuits'], quantity: 20, maxCapacity: 25, price: 12 },
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
          { slotNumber: 'C2', product: productMap['parle-g_biscuits'], quantity: 12, maxCapacity: 15, price: 10 }
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
    
    // Add createdBy to each machine
    const machinesWithCreatedBy = machines.map(machine => ({
      ...machine,
      createdBy
    }));
    
    const createdMachines = await VendingMachine.insertMany(machinesWithCreatedBy);
    
    logger.info(`✅ Successfully seeded ${createdMachines.length} vending machines`);
    
    // Create machine mapping
    const machineMap: { [key: string]: Types.ObjectId } = {};
    createdMachines.forEach(machine => {
      machineMap[machine.machineId] = machine._id;
    });
    
    // Log created machines
    const machineNames = createdMachines.map(m => `${m.name} (${m.machineId})`);
    logger.info(`🏪 Created vending machines: ${machineNames.join(', ')}`);
    
    return machineMap;
    
  } catch (error) {
    logger.error('❌ Error seeding vending machines:', error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  import('../config/database').then(({ connectDB }) => {
    import('./products.seeder').then(({ seedProducts }) => {
      connectDB().then(() => {
        seedProducts().then((productMap) => {
          seedVendingMachines(null, productMap).then(() => {
            process.exit(0);
          }).catch((error) => {
            logger.error('Failed to seed vending machines:', error);
            process.exit(1);
          });
        });
      });
    });
  });
}