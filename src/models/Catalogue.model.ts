import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICategory extends Document {
  category_name: string;
  description: string;
  category_status?: "active" | "inactive";
  category_image: ICategoryImageData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryImageData {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
const categoryImageSchema = new Schema<ICategoryImageData>(
  {
    image_name: {
      type: String,
      required: true,
      trim: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    cloudinary_public_id: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);
const CategorySchema = new mongoose.Schema<ICategory>(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    category_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: { type: String, required: true },
    category_status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    category_image: [categoryImageSchema],
  },
  { timestamps: true }
);
export interface ISubCategory extends Document {
  sub_category_name: string;
  description: string;
  category_id: Types.ObjectId;
  sub_category_status: "active" | "inactive";
  sub_category_image: ISubCategoryImageData[];
  createdAt: Date;
  updatedAt: Date;
}
export interface ISubCategoryImageData {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
const subCategoryImageSchema = new Schema<ISubCategoryImageData>(
  {
    image_name: {
      type: String,
      required: true,
      trim: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    cloudinary_public_id: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const SubCategorySchema = new Schema<ISubCategory>(
  {
    sub_category_name: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, required: true },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sub_category_status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    sub_category_image: [subCategoryImageSchema],
  },
  { timestamps: true }
);

SubCategorySchema.index(
  { category_id: 1, sub_category_name: 1 },
  { unique: true, name: "category_subcategory_unique" }
);

export const CategoryModel = mongoose.model<ICategory>("Category", CategorySchema);

export const SubCategoryModel = mongoose.model<ISubCategory>("SubCategory", SubCategorySchema);

export interface IProductImageData {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

const productImageSchema = new Schema<IProductImageData>(
  {
    image_name: {
      type: String,
      required: true,
      trim: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    cloudinary_public_id: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export interface ICatalogue extends Document {
  sku_id: string;
  product_name: string;
  brand_name: string;
  description: string;
  category: Types.ObjectId;
  sub_category: Types.ObjectId;
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
  product_images: IProductImageData[];
  status: "active" | "inactive";
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
      ref: "Category",
      required: true,
    },
    sub_category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
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
    product_images: [productImageSchema],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

CatalogueSchema.index({ category: 1 });
CatalogueSchema.index({ sub_category: 1 });
CatalogueSchema.index({ status: 1 });
CatalogueSchema.pre<ICatalogue>("save", async function (next) {
  // Only generate if sku_id is not already set OR if it's being auto-generated
  if (!this.sku_id || this.isNew) {
    try {
      // Fetch category with proper population
      const category = await mongoose.model("Category").findById(this.category);
      const productName = this.product_name;

      if (!category) {
        throw new Error("Category not found");
      }

      // Get category code (first 3 letters, uppercase)
      let categoryCode = category.category_name.slice(0, 3).toUpperCase();
      // Handle categories with less than 3 characters
      if (categoryCode.length < 3) {
        categoryCode = categoryCode.padEnd(3, "X");
      }

      // Get product code (first 3 letters, uppercase, remove spaces)
      let productCode = productName.replace(/\s/g, "").slice(0, 3).toUpperCase();
      if (productCode.length < 3) {
        productCode = productCode.padEnd(3, "X");
      }

      // Generate sequential number instead of random for better consistency
      const prefix = `SKU${categoryCode}${productCode}`;

      // Find the last SKU with the same prefix
      const lastSku = await mongoose
        .model("Catalogue")
        .findOne({ sku_id: { $regex: `^${prefix}` } })
        .sort({ createdAt: -1 });

      let sequenceNum = 1;
      if (lastSku && lastSku.sku_id) {
        const lastNum = parseInt(lastSku.sku_id.slice(-3));
        sequenceNum = lastNum + 1;
      }

      // Ensure sequence number is 3 digits
      const sequenceStr = sequenceNum.toString().padStart(3, "0");
      this.sku_id = `${prefix}${sequenceStr}`;

      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});
export const CatalogueModel = mongoose.model<ICatalogue>("Catalogue", CatalogueSchema);
