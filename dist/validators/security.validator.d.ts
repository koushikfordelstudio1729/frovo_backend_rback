import { z } from "zod";
export declare const updateSecurityConfigSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        mfaEnforced: z.ZodOptional<z.ZodBoolean>;
        ipAllowlist: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        ssoEnabled: z.ZodOptional<z.ZodBoolean>;
        ssoConfig: z.ZodOptional<z.ZodObject<{
            clientId: z.ZodString;
            clientSecret: z.ZodString;
            metadataUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        }, {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        }>>;
        passwordPolicy: z.ZodOptional<z.ZodObject<{
            minLength: z.ZodOptional<z.ZodNumber>;
            requireUppercase: z.ZodOptional<z.ZodBoolean>;
            requireLowercase: z.ZodOptional<z.ZodBoolean>;
            requireNumbers: z.ZodOptional<z.ZodBoolean>;
            requireSpecialChars: z.ZodOptional<z.ZodBoolean>;
            expiryDays: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        }, {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        }>>;
        sessionTimeout: z.ZodOptional<z.ZodNumber>;
        maxLoginAttempts: z.ZodOptional<z.ZodNumber>;
        lockoutDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mfaEnforced?: boolean;
        ipAllowlist?: string[];
        ssoEnabled?: boolean;
        ssoConfig?: {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        };
        passwordPolicy?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        };
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        lockoutDuration?: number;
    }, {
        mfaEnforced?: boolean;
        ipAllowlist?: string[];
        ssoEnabled?: boolean;
        ssoConfig?: {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        };
        passwordPolicy?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        };
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        lockoutDuration?: number;
    }>, {
        mfaEnforced?: boolean;
        ipAllowlist?: string[];
        ssoEnabled?: boolean;
        ssoConfig?: {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        };
        passwordPolicy?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        };
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        lockoutDuration?: number;
    }, {
        mfaEnforced?: boolean;
        ipAllowlist?: string[];
        ssoEnabled?: boolean;
        ssoConfig?: {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        };
        passwordPolicy?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        };
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        lockoutDuration?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        mfaEnforced?: boolean;
        ipAllowlist?: string[];
        ssoEnabled?: boolean;
        ssoConfig?: {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        };
        passwordPolicy?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        };
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        lockoutDuration?: number;
    };
}, {
    body?: {
        mfaEnforced?: boolean;
        ipAllowlist?: string[];
        ssoEnabled?: boolean;
        ssoConfig?: {
            clientId?: string;
            clientSecret?: string;
            metadataUrl?: string;
        };
        passwordPolicy?: {
            minLength?: number;
            requireUppercase?: boolean;
            requireLowercase?: boolean;
            requireNumbers?: boolean;
            requireSpecialChars?: boolean;
            expiryDays?: number;
        };
        sessionTimeout?: number;
        maxLoginAttempts?: number;
        lockoutDuration?: number;
    };
}>;
export declare const testSSOConfigSchema: z.ZodObject<{
    body: z.ZodObject<{
        clientId: z.ZodString;
        clientSecret: z.ZodString;
        metadataUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        clientId?: string;
        clientSecret?: string;
        metadataUrl?: string;
    }, {
        clientId?: string;
        clientSecret?: string;
        metadataUrl?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        clientId?: string;
        clientSecret?: string;
        metadataUrl?: string;
    };
}, {
    body?: {
        clientId?: string;
        clientSecret?: string;
        metadataUrl?: string;
    };
}>;
//# sourceMappingURL=security.validator.d.ts.map