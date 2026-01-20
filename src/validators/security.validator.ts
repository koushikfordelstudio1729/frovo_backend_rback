import { z } from "zod";

export const updateSecurityConfigSchema = z.object({
  body: z
    .object({
      mfaEnforced: z.boolean().optional(),
      ipAllowlist: z
        .array(z.string().regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, "Invalid CIDR notation"))
        .optional(),
      ssoEnabled: z.boolean().optional(),
      ssoConfig: z
        .object({
          clientId: z.string().trim().min(1, "SSO Client ID is required"),
          clientSecret: z.string().trim().min(1, "SSO Client Secret is required"),
          metadataUrl: z.string().url("Invalid metadata URL"),
        })
        .optional(),
      passwordPolicy: z
        .object({
          minLength: z
            .number()
            .min(6, "Minimum password length cannot be less than 6")
            .max(128, "Minimum password length cannot exceed 128")
            .optional(),
          requireUppercase: z.boolean().optional(),
          requireLowercase: z.boolean().optional(),
          requireNumbers: z.boolean().optional(),
          requireSpecialChars: z.boolean().optional(),
          expiryDays: z
            .number()
            .min(1, "Password expiry cannot be less than 1 day")
            .max(365, "Password expiry cannot exceed 365 days")
            .optional(),
        })
        .optional(),
      sessionTimeout: z
        .number()
        .min(300000, "Session timeout cannot be less than 5 minutes")
        .max(604800000, "Session timeout cannot exceed 7 days")
        .optional(),
      maxLoginAttempts: z
        .number()
        .min(3, "Max login attempts cannot be less than 3")
        .max(20, "Max login attempts cannot exceed 20")
        .optional(),
      lockoutDuration: z
        .number()
        .min(60000, "Lockout duration cannot be less than 1 minute")
        .max(3600000, "Lockout duration cannot exceed 1 hour")
        .optional(),
    })
    .refine(
      data => {
        if (data.ssoEnabled && !data.ssoConfig) {
          return false;
        }
        return true;
      },
      {
        message: "SSO configuration is required when SSO is enabled",
        path: ["ssoConfig"],
      }
    ),
});

export const testSSOConfigSchema = z.object({
  body: z.object({
    clientId: z.string().trim().min(1, "SSO Client ID is required"),
    clientSecret: z.string().trim().min(1, "SSO Client Secret is required"),
    metadataUrl: z.string().url("Invalid metadata URL"),
  }),
});
