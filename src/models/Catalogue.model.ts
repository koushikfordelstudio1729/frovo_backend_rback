import mongoose, { Document, Types } from "mongoose";

// CATEGORY SCHEMA
export interface ICategory extends Document {
    category_name: string;
    description: string;
    sub_details: {
        sub_categories: string;
        description_sub_category: string;
    }
    category_status?: 'active' | 'inactive';
    category_image: string;
     // In interface but not in schema
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new mongoose.Schema<ICategory>(
    {
        category_name: { type: String, required: true },
        description: { type: String, required: true },
        sub_details: {
            sub_categories: { type: String, required: true },
            description_sub_category: { type: String, required: true }
        },
        category_image: { type: String, required: true },
        category_status: { type: String, enum: ['active', 'inactive'], default: 'active' },
         // Added missing field
    },
    { timestamps: true }
);

// Compound unique index
CategorySchema.index({ 
    category_name: 1, 
    'sub_details.sub_categories': 1 
}, { unique: true, name: 'category_subcategories_unique' });

export const CategoryModel = mongoose.model<ICategory>(
    "Category",
    CategorySchema
);

// CATALOGUE SCHEMA
export interface ICatalogue extends Document {
    sku_id: string;
    product_name: string;
    brand_name: string;
    description: string;
    category: Types.ObjectId; // Changed to ObjectId for proper reference
    sub_category: string; // This should match sub_details.sub_categories from Category
    manufacturer_name: string;
    manufacturer_address: string;
    shell_life: string;
    expiry_alert_threshold: number;
    tages_label: string;
    unit_size: string;
    base_price: number;
    final_price: number;
    barcode: string;
    nutrition_information: string;
    ingredients: string;
    images: string[];
    status: 'active' | 'inactive';
    
    createdAt: Date;
    updatedAt: Date;
}

const CatalogueSchema = new mongoose.Schema<ICatalogue>(
    {
        sku_id: { type: String, required: true, unique: true },
        product_name: { type: String, required: true },
        brand_name: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Changed to ObjectId
        sub_category: { type: String, required: true }, // Keep as string to match sub_categories
        manufacturer_name: { type: String, required: true },
        manufacturer_address: { type: String, required: true },
        shell_life: { type: String, required: true },
        expiry_alert_threshold: { type: Number, required: true },
        tages_label: { type: String, required: true },
        unit_size: { type: String, required: true },
        base_price: { type: Number, required: true },
        final_price: { type: Number, required: true },
        barcode: { type: String, required: true, unique: true },
        nutrition_information: { type: String, required: true },
        ingredients: { type: String, required: true },
        images: { type: [String], required: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        // Added missing field
    },
    { timestamps: true }
);

// Optional: Index for faster queries
CatalogueSchema.index({ category: 1 });
CatalogueSchema.index({ sub_category: 1 });
CatalogueSchema.index({ status: 1 });
CatalogueSchema.index({ createdBy: 1 });

export const CatalogueModel = mongoose.model<ICatalogue>(
    "Catalogue",
    CatalogueSchema
);