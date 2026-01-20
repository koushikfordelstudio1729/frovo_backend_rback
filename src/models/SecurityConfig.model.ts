import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISSOConfig {
  clientId: string;
  clientSecret: string;
  metadataUrl: string;
}

export interface IPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays?: number;
}

export interface ISecurityConfig extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  mfaEnforced: boolean;
  ipAllowlist: string[];
  ssoEnabled: boolean;
  ssoConfig?: ISSOConfig | undefined;
  passwordPolicy: IPasswordPolicy;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ssoConfigSchema = new Schema<ISSOConfig>(
  {
    clientId: {
      type: String,
      required: [true, "SSO Client ID is required"],
      trim: true,
    },
    clientSecret: {
      type: String,
      required: [true, "SSO Client Secret is required"],
      select: false,
    },
    metadataUrl: {
      type: String,
      required: [true, "SSO Metadata URL is required"],
      trim: true,
      match: [/^https?:\/\/.+/, "Invalid metadata URL format"],
    },
  },
  { _id: false }
);

const passwordPolicySchema = new Schema<IPasswordPolicy>(
  {
    minLength: {
      type: Number,
      default: 8,
      min: [6, "Minimum password length cannot be less than 6"],
      max: [128, "Minimum password length cannot exceed 128"],
    },
    requireUppercase: {
      type: Boolean,
      default: true,
    },
    requireLowercase: {
      type: Boolean,
      default: true,
    },
    requireNumbers: {
      type: Boolean,
      default: true,
    },
    requireSpecialChars: {
      type: Boolean,
      default: false,
    },
    expiryDays: {
      type: Number,
      min: [1, "Password expiry cannot be less than 1 day"],
      max: [365, "Password expiry cannot exceed 365 days"],
    },
  },
  { _id: false }
);

const securityConfigSchema = new Schema<ISecurityConfig>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: [true, "Organization ID is required"],
      unique: true,
    },
    mfaEnforced: {
      type: Boolean,
      default: false,
    },
    ipAllowlist: [
      {
        type: String,
        validate: {
          validator: function (ip: string) {
            const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
            return cidrRegex.test(ip);
          },
          message: "Invalid CIDR notation",
        },
      },
    ],
    ssoEnabled: {
      type: Boolean,
      default: false,
    },
    ssoConfig: {
      type: ssoConfigSchema,
    },
    passwordPolicy: {
      type: passwordPolicySchema,
      required: true,
      default: () => ({}),
    },
    sessionTimeout: {
      type: Number,
      default: 86400000,
      min: [300000, "Session timeout cannot be less than 5 minutes"],
      max: [604800000, "Session timeout cannot exceed 7 days"],
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: [3, "Max login attempts cannot be less than 3"],
      max: [20, "Max login attempts cannot exceed 20"],
    },
    lockoutDuration: {
      type: Number,
      default: 900000,
      min: [60000, "Lockout duration cannot be less than 1 minute"],
      max: [3600000, "Lockout duration cannot exceed 1 hour"],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UpdatedBy is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

securityConfigSchema.pre("save", function (next) {
  if (this.ssoEnabled && !this.ssoConfig) {
    return next(new Error("SSO configuration is required when SSO is enabled"));
  }

  if (!this.ssoEnabled) {
    this.ssoConfig = undefined;
  }

  next();
});

securityConfigSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

securityConfigSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    if (cleanRet.ssoConfig && cleanRet.ssoConfig.clientSecret) {
      (cleanRet as any).ssoConfig = {
        clientId: cleanRet.ssoConfig.clientId,
        metadataUrl: cleanRet.ssoConfig.metadataUrl,
      };
    }
    return cleanRet;
  },
});

export const SecurityConfig = mongoose.model<ISecurityConfig>(
  "SecurityConfig",
  securityConfigSchema
);
