import { Product } from '../models';
import { Types } from 'mongoose';

export interface ProductQuery {
  category?: string;
  brand?: string;
  isActive?: boolean | undefined;
  search?: string;
}

class ProductService {
  
  async getProductById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid product ID');
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  }
  
  async getAllProducts(query: ProductQuery = {}) {
    const filter: any = {};
    
    // Category filter
    if (query.category) {
      filter.category = new RegExp(query.category, 'i');
    }
    
    // Brand filter
    if (query.brand) {
      filter.brand = new RegExp(query.brand, 'i');
    }
    
    // Active status filter
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }
    
    // Search filter (name, brand, or category)
    if (query.search) {
      filter.$or = [
        { name: new RegExp(query.search, 'i') },
        { brand: new RegExp(query.search, 'i') },
        { category: new RegExp(query.search, 'i') },
        { description: new RegExp(query.search, 'i') }
      ];
    }
    
    const products = await Product.find(filter)
      .sort({ name: 1 });
    
    return products;
  }
  
  async getProductsByCategory(category: string) {
    const products = await Product.find({
      category: new RegExp(category, 'i'),
      isActive: true
    }).sort({ name: 1 });
    
    return products;
  }
  
  async getProductCategories() {
    // Get unique categories from active products
    const categories = await Product.aggregate([
      {
        $match: {
          isActive: true
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { category: 1 }
      }
    ]);
    
    return categories;
  }
  
  async getProductAvailabilityAcrossMachines(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }
    
    const { VendingMachine } = await import('../models');
    
    // Find all machines that have this product in stock
    const machinesWithProduct = await VendingMachine.find({
      'productSlots.product': productId,
      'productSlots.quantity': { $gt: 0 },
      status: 'Active',
      isOnline: true
    })
    .populate('productSlots.product')
    .select('machineId name location productSlots');
    
    const availability = [];
    
    for (const machine of machinesWithProduct) {
      const productSlots = machine.productSlots.filter(slot => 
        slot.product._id.toString() === productId && slot.quantity > 0
      );
      
      if (productSlots.length > 0) {
        availability.push({
          machineId: machine.machineId,
          machineName: machine.name,
          location: machine.location,
          slots: productSlots.map(slot => ({
            slotNumber: slot.slotNumber,
            quantity: slot.quantity,
            price: slot.price
          })),
          totalAvailable: productSlots.reduce((sum, slot) => sum + slot.quantity, 0)
        });
      }
    }
    
    return {
      productId,
      totalMachines: availability.length,
      totalQuantity: availability.reduce((sum, machine) => sum + machine.totalAvailable, 0),
      availability: availability.sort((a, b) => {
        // Sort by city first, then by machine name
        if (a.location.city !== b.location.city) {
          return a.location.city.localeCompare(b.location.city);
        }
        return a.machineName.localeCompare(b.machineName);
      })
    };
  }
}

export const productService = new ProductService();