"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const Product_model_1 = require("../models/Product.model");
const mongoose_1 = require("mongoose");
class ProductService {
    async getProductById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid product ID');
        }
        const product = await Product_model_1.Product.findById(id);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }
    async getAllProducts(query = {}) {
        const filter = {};
        if (query.category) {
            filter.category = new RegExp(query.category, 'i');
        }
        if (query.brand) {
            filter.brand = new RegExp(query.brand, 'i');
        }
        if (query.isActive !== undefined) {
            filter.isActive = query.isActive;
        }
        if (query.search) {
            filter.$or = [
                { name: new RegExp(query.search, 'i') },
                { brand: new RegExp(query.search, 'i') },
                { category: new RegExp(query.search, 'i') },
                { description: new RegExp(query.search, 'i') }
            ];
        }
        const products = await Product_model_1.Product.find(filter)
            .sort({ name: 1 });
        return products;
    }
    async getProductsByCategory(category) {
        const products = await Product_model_1.Product.find({
            category: new RegExp(category, 'i'),
            isActive: true
        }).sort({ name: 1 });
        return products;
    }
    async getProductCategories() {
        const categories = await Product_model_1.Product.aggregate([
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
    async getProductAvailabilityAcrossMachines(productId) {
        if (!mongoose_1.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }
        const { VendingMachine } = await Promise.resolve().then(() => __importStar(require('../models/VendingMachine.model')));
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
            const productSlots = machine.productSlots.filter(slot => slot.product._id.toString() === productId && slot.quantity > 0);
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
                if (a.location.city !== b.location.city) {
                    return a.location.city.localeCompare(b.location.city);
                }
                return a.machineName.localeCompare(b.machineName);
            })
        };
    }
}
exports.productService = new ProductService();
