import { Schema, model, Document, Types } from "mongoose";

export interface ICartItem {
  product: Types.ObjectId;
  productName: string;
  productPrice: number;
  machineId: string;
  slotNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: Date;
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  totalItems: number;
  totalAmount: number;
  lastUpdated: Date;
  expiresAt: Date;
  isActive: boolean;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
    },
    productPrice: {
      type: Number,
      required: [true, "Product price is required"],
    },
    machineId: {
      type: String,
      required: [true, "Machine ID is required"],
    },
    slotNumber: {
      type: String,
      required: [true, "Slot number is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price must be positive"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price must be positive"],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
      min: [0, "Total items cannot be negative"],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cartSchema.index({ userId: 1, isActive: 1 });

cartSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.lastUpdated = new Date();
  }
  next();
});

cartSchema.virtual("isEmpty").get(function () {
  return this.items.length === 0;
});

cartSchema.methods["addItem"] = function (item: Omit<ICartItem, "addedAt" | "totalPrice">) {
  const existingItemIndex = (this as any).items.findIndex(
    (cartItem: ICartItem) =>
      cartItem.product.toString() === item.product.toString() &&
      cartItem.machineId === item.machineId &&
      cartItem.slotNumber === item.slotNumber
  );

  const totalPrice = item.quantity * item.unitPrice;

  if (existingItemIndex > -1) {
    (this as any).items[existingItemIndex].quantity += item.quantity;
    (this as any).items[existingItemIndex].totalPrice =
      (this as any).items[existingItemIndex].quantity *
      (this as any).items[existingItemIndex].unitPrice;
  } else {
    (this as any).items.push({
      ...item,
      totalPrice,
      addedAt: new Date(),
    });
  }

  return (this as any).save();
};

cartSchema.methods["removeItem"] = function (
  productId: string,
  machineId: string,
  slotNumber: string
) {
  (this as any).items = (this as any).items.filter(
    (item: ICartItem) =>
      !(
        item.product.toString() === productId &&
        item.machineId === machineId &&
        item.slotNumber === slotNumber
      )
  );
  return (this as any).save();
};

cartSchema.methods["updateItemQuantity"] = function (
  productId: string,
  machineId: string,
  slotNumber: string,
  quantity: number
) {
  const itemIndex = (this as any).items.findIndex(
    (item: ICartItem) =>
      item.product.toString() === productId &&
      item.machineId === machineId &&
      item.slotNumber === slotNumber
  );

  if (itemIndex > -1) {
    if (quantity <= 0) {
      (this as any).items.splice(itemIndex, 1);
    } else {
      (this as any).items[itemIndex].quantity = quantity;
      (this as any).items[itemIndex].totalPrice =
        quantity * (this as any).items[itemIndex].unitPrice;
    }
    return (this as any).save();
  }
  throw new Error("Item not found in cart");
};

cartSchema.methods["clearCart"] = function () {
  (this as any).items = [];
  return (this as any).save();
};

export const Cart = model<ICart>("Cart", cartSchema);
