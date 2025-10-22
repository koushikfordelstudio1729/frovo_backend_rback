import mongoose, { Document, Schema, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserStatus } from './enums';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  departments: Types.ObjectId[];
  roles: Types.ObjectId[];
  status: UserStatus;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLogin?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPermissions(): Promise<string[]>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\s\d-()]+$/, 'Please provide a valid phone number']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    departments: [{
      type: Schema.Types.ObjectId,
      ref: 'Department'
    }],
    roles: [{
      type: Schema.Types.ObjectId,
      ref: 'Role'
    }],
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE
    },
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String,
      select: false
    },
    lastLogin: {
      type: Date
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'CreatedBy is required']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ departments: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env['BCRYPT_ROUNDS'] || '10'));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
userSchema.methods['comparePassword'] = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this['password']);
};

// Method to get user permissions
userSchema.methods['getPermissions'] = async function(): Promise<string[]> {
  await this['populate']('roles');
  const permissions = new Set<string>();
  
  for (const role of this['roles']) {
    if (role.permissions.includes('*:*')) {
      return ['*:*'];
    }
    role.permissions.forEach((permission: string) => permissions.add(permission));
  }
  
  return Array.from(permissions);
};

// Virtual for id
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    const { _id, __v, password, mfaSecret, ...cleanRet } = ret;
    return cleanRet;
  }
});

export const User = mongoose.model<IUser>('User', userSchema);