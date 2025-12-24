import mongoose, { Document, Schema, Types } from "mongoose";

// Plain data interface for category images (without Mongoose methods)
export interface ICategoryImageData {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

// Document Sub-Schema for Category Images
const categoryImageSchema = new Schema<ICategoryImageData>({
  image_name: {
    type: String,
    required: true,
    trim: true
  },
  file_url: {
    type: String,
    required: true
  },
  cloudinary_public_id: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// CATEGORY SCHEMA
export interface ISubCategory {
  _id: Types.ObjectId;
  sub_category_name: string;
  description: string;
}

export interface ICategory extends Document {
  _id: Types.ObjectId;
  category_name: string;
  description: string;
  sub_categories: ISubCategory[]; // Array of sub-categories
  category_status?: 'active' | 'inactive';
  category_image: ICategoryImageData;
  createdAt: Date;
  updatedAt: Date;
}

const SubCategorySchema = new Schema<ISubCategory>({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  sub_category_name: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: true });

const CategorySchema = new mongoose.Schema<ICategory>(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    category_name: { type: String, required: true },
    description: { type: String, required: true },
    sub_categories: [SubCategorySchema], // Array of sub-categories
    category_status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    category_image: categoryImageSchema,
  },
  { timestamps: true }
);

// Compound unique index for category name + sub-category name combination
CategorySchema.index({
  category_name: 1,
  'sub_categories.sub_category_name': 1
}, { 
  unique: true, 
  name: 'category_subcategories_unique',
  sparse: true
});

export const CategoryModel = mongoose.model<ICategory>(
  "Category",
  CategorySchema
);

// PRODUCT IMAGE INTERFACE AND SCHEMA
export interface IProductImageData {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

// Document Sub-Schema for Product Images
const productImageSchema = new Schema<IProductImageData>({
  image_name: {
    type: String,
    required: true,
    trim: true
  },
  file_url: {
    type: String,
    required: true
  },
  cloudinary_public_id: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// CATALOGUE SCHEMA
export interface ICatalogue extends Document {
  sku_id: string;
  product_name: string;
  brand_name: string;
  description: string;
  category: Types.ObjectId; // Category ID reference
  sub_category: Types.ObjectId; // Sub-category ID reference
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
  product_images?: IProductImageData[]; // ✅ FIXED: Changed to array
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
    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Category', 
      required: true 
    },
    sub_category: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      validate: {
        validator: async function(value: mongoose.Types.ObjectId) {
          // ✅ FIXED: Updated to match new sub_categories array structure
          const category = await mongoose.model('Category').findOne({
            _id: this.category,
            'sub_categories._id': value // Updated to match new structure
          });
          return !!category;
        },
        message: 'Sub-category ID does not exist in the specified category'
      }
    },
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
    product_images: [productImageSchema], // Array of product images
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// Indexes for faster queries
CatalogueSchema.index({ category: 1 });
CatalogueSchema.index({ sub_category: 1 });
CatalogueSchema.index({ status: 1 });
CatalogueSchema.index({ sku_id: 1 });
CatalogueSchema.index({ barcode: 1 });

export const CatalogueModel = mongoose.model<ICatalogue>(
  "Catalogue",
  CatalogueSchema
);