import { Schema, model, Document, Types } from 'mongoose';

export enum PaymentMethod {
  CARD = 'card',
  UPI = 'upi',
  NETBANKING = 'netbanking',
  WALLET = 'wallet',
  CASH = 'cash'
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  PAYTM = 'paytm',
  PHONEPE = 'phonepe',
  GOOGLEPAY = 'googlepay',
  CASH = 'cash'
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface IPaymentMetadata {
  orderId: string;
  userId: Types.ObjectId;
  machineId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface IGatewayResponse {
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  signature?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface IPayment extends Document {
  paymentId: string;
  orderId: string;
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentGateway: PaymentGateway;
  transactionType: TransactionType;
  status: TransactionStatus;
  gatewayResponse: IGatewayResponse;
  metadata: IPaymentMetadata;
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  refundableAmount: number;
  refundedAmount: number;
  notes?: string;
}

const paymentMetadataSchema = new Schema<IPaymentMetadata>({
  orderId: {
    type: String,
    required: [true, 'Order ID is required']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  machineId: {
    type: String,
    required: [true, 'Machine ID is required']
  },
  items: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }
  }]
}, { _id: false });

const gatewayResponseSchema = new Schema<IGatewayResponse>({
  gatewayTransactionId: String,
  gatewayOrderId: String,
  gatewayPaymentId: String,
  signature: String,
  errorCode: String,
  errorMessage: String,
  rawResponse: Schema.Types.Mixed
}, { _id: false });

const paymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: [true, 'Payment method is required']
  },
  paymentGateway: {
    type: String,
    enum: Object.values(PaymentGateway),
    required: [true, 'Payment gateway is required']
  },
  transactionType: {
    type: String,
    enum: Object.values(TransactionType),
    default: TransactionType.PAYMENT
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true
  },
  gatewayResponse: gatewayResponseSchema,
  metadata: paymentMetadataSchema,
  initiatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date,
  failedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: [0, 'Attempts cannot be negative']
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Max attempts must be at least 1']
  },
  lastAttemptAt: Date,
  refundableAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refundable amount cannot be negative']
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refunded amount cannot be negative']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
paymentSchema.index({ userId: 1, initiatedAt: -1 });
paymentSchema.index({ status: 1, initiatedAt: -1 });
paymentSchema.index({ paymentGateway: 1, status: 1 });
paymentSchema.index({ orderId: 1, transactionType: 1 });

// Generate payment ID
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.paymentId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8);
    this.paymentId = `PAY-${timestamp}-${random}`.toUpperCase();
  }
  
  // Update refundable amount for successful payments
  if (this.status === TransactionStatus.SUCCESS && this.transactionType === TransactionType.PAYMENT) {
    this.refundableAmount = this.amount - this.refundedAmount;
  }
  
  next();
});

// Virtual to check if payment is successful
paymentSchema.virtual('isSuccessful').get(function() {
  return this.status === TransactionStatus.SUCCESS;
});

// Virtual to check if payment is failed
paymentSchema.virtual('isFailed').get(function() {
  return [TransactionStatus.FAILED, TransactionStatus.CANCELLED, TransactionStatus.EXPIRED].includes(this.status);
});

// Virtual to check if payment is pending
paymentSchema.virtual('isPending').get(function() {
  return [TransactionStatus.PENDING, TransactionStatus.PROCESSING].includes(this.status);
});

// Virtual to check if payment is expired
paymentSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual to check if refund is possible
paymentSchema.virtual('canBeRefunded').get(function() {
  return this.status === TransactionStatus.SUCCESS && 
         this.refundableAmount > 0 && 
         this.transactionType === TransactionType.PAYMENT;
});

// Method to mark payment as successful
paymentSchema.methods['markAsSuccessful'] = function(gatewayResponse: Partial<IGatewayResponse>) {
  (this as any).status = TransactionStatus.SUCCESS;
  (this as any).completedAt = new Date();
  (this as any).gatewayResponse = { ...(this as any).gatewayResponse, ...gatewayResponse };
  (this as any).refundableAmount = (this as any).amount;
  return (this as any).save();
};

// Method to mark payment as failed
paymentSchema.methods['markAsFailed'] = function(errorCode?: string, errorMessage?: string) {
  (this as any).status = TransactionStatus.FAILED;
  (this as any).failedAt = new Date();
  if (errorCode) (this as any).gatewayResponse.errorCode = errorCode;
  if (errorMessage) (this as any).gatewayResponse.errorMessage = errorMessage;
  return (this as any).save();
};

// Method to increment attempt count
paymentSchema.methods['incrementAttempt'] = function() {
  (this as any).attempts += 1;
  (this as any).lastAttemptAt = new Date();
  
  if ((this as any).attempts >= (this as any).maxAttempts) {
    (this as any).status = TransactionStatus.FAILED;
    (this as any).failedAt = new Date();
  }
  
  return (this as any).save();
};

// Method to process refund
paymentSchema.methods['processRefund'] = function(refundAmount: number, refundId: string) {
  if (!(this as any).canBeRefunded) {
    throw new Error('Payment cannot be refunded');
  }
  
  if (refundAmount > (this as any).refundableAmount) {
    throw new Error('Refund amount exceeds refundable amount');
  }
  
  (this as any).refundedAmount += refundAmount;
  (this as any).refundableAmount -= refundAmount;
  
  // Update gateway response with refund details
  (this as any).gatewayResponse.gatewayTransactionId = refundId;
  
  return (this as any).save();
};

// Static method to create payment
paymentSchema.statics['createPayment'] = function(paymentData: Partial<IPayment>) {
  return new this(paymentData).save();
};

// Static method to find payment by order
paymentSchema.statics['findByOrderId'] = function(orderId: string) {
  return this.findOne({ orderId, transactionType: TransactionType.PAYMENT });
};

export const Payment = model<IPayment>('Payment', paymentSchema);