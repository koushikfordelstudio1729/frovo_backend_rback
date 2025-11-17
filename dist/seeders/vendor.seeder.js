"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedVendors = void 0;
const Vendor_model_1 = require("../models/Vendor.model");
const seedVendors = async (createdBy) => {
    try {
        const vendors = [
            {
                name: 'Global Food Distributors',
                code: 'VEND-001',
                contactPerson: 'John Smith',
                email: 'john@globalfood.com',
                phone: '+1-555-0101',
                address: {
                    street: '123 Commerce St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA'
                },
                taxId: 'TAX-001-123',
                paymentTerms: 'Net 30',
                category: 'distributor',
                createdBy: createdBy,
                isActive: true
            },
            {
                name: 'Premium Snacks Inc',
                code: 'VEND-002',
                contactPerson: 'Sarah Johnson',
                email: 'sarah@premiumsnacks.com',
                phone: '+1-555-0102',
                address: {
                    street: '456 Industry Ave',
                    city: 'Chicago',
                    state: 'IL',
                    zipCode: '60007',
                    country: 'USA'
                },
                taxId: 'TAX-002-456',
                paymentTerms: 'Net 45',
                category: 'manufacturer',
                createdBy: createdBy,
                isActive: true
            },
            {
                name: 'Beverage Supply Co',
                code: 'VEND-003',
                contactPerson: 'Mike Davis',
                email: 'mike@beveragesupply.com',
                phone: '+1-555-0103',
                address: {
                    street: '789 Distribution Blvd',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90001',
                    country: 'USA'
                },
                taxId: 'TAX-003-789',
                paymentTerms: 'Net 15',
                category: 'supplier',
                createdBy: createdBy,
                isActive: true
            }
        ];
        await Vendor_model_1.Vendor.deleteMany({});
        await Vendor_model_1.Vendor.insertMany(vendors);
        console.log('✅ Vendors seeded successfully');
    }
    catch (error) {
        console.error('❌ Error seeding vendors:', error);
        throw error;
    }
};
exports.seedVendors = seedVendors;
//# sourceMappingURL=vendor.seeder.js.map