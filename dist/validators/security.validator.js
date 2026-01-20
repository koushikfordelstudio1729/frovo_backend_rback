"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSSOConfigSchema = exports.updateSecurityConfigSchema = void 0;
const zod_1 = require("zod");
exports.updateSecurityConfigSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        mfaEnforced: zod_1.z.boolean().optional(),
        ipAllowlist: zod_1.z
            .array(zod_1.z.string().regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, "Invalid CIDR notation"))
            .optional(),
        ssoEnabled: zod_1.z.boolean().optional(),
        ssoConfig: zod_1.z
            .object({
            clientId: zod_1.z.string().trim().min(1, "SSO Client ID is required"),
            clientSecret: zod_1.z.string().trim().min(1, "SSO Client Secret is required"),
            metadataUrl: zod_1.z.string().url("Invalid metadata URL"),
        })
            .optional(),
        passwordPolicy: zod_1.z
            .object({
            minLength: zod_1.z
                .number()
                .min(6, "Minimum password length cannot be less than 6")
                .max(128, "Minimum password length cannot exceed 128")
                .optional(),
            requireUppercase: zod_1.z.boolean().optional(),
            requireLowercase: zod_1.z.boolean().optional(),
            requireNumbers: zod_1.z.boolean().optional(),
            requireSpecialChars: zod_1.z.boolean().optional(),
            expiryDays: zod_1.z
                .number()
                .min(1, "Password expiry cannot be less than 1 day")
                .max(365, "Password expiry cannot exceed 365 days")
                .optional(),
        })
            .optional(),
        sessionTimeout: zod_1.z
            .number()
            .min(300000, "Session timeout cannot be less than 5 minutes")
            .max(604800000, "Session timeout cannot exceed 7 days")
            .optional(),
        maxLoginAttempts: zod_1.z
            .number()
            .min(3, "Max login attempts cannot be less than 3")
            .max(20, "Max login attempts cannot exceed 20")
            .optional(),
        lockoutDuration: zod_1.z
            .number()
            .min(60000, "Lockout duration cannot be less than 1 minute")
            .max(3600000, "Lockout duration cannot exceed 1 hour")
            .optional(),
    })
        .refine(data => {
        if (data.ssoEnabled && !data.ssoConfig) {
            return false;
        }
        return true;
    }, {
        message: "SSO configuration is required when SSO is enabled",
        path: ["ssoConfig"],
    }),
});
exports.testSSOConfigSchema = zod_1.z.object({
    body: zod_1.z.object({
        clientId: zod_1.z.string().trim().min(1, "SSO Client ID is required"),
        clientSecret: zod_1.z.string().trim().min(1, "SSO Client Secret is required"),
        metadataUrl: zod_1.z.string().url("Invalid metadata URL"),
    }),
});
