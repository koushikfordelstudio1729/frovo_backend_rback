import { z } from 'zod';
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
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        }, {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        }>>;
        passwordPolicy: z.ZodOptional<z.ZodObject<{
            minLength: z.ZodOptional<z.ZodNumber>;
            requireUppercase: z.ZodOptional<z.ZodBoolean>;
            requireLowercase: z.ZodOptional<z.ZodBoolean>;
            requireNumbers: z.ZodOptional<z.ZodBoolean>;
            requireSpecialChars: z.ZodOptional<z.ZodBoolean>;
            expiryDays: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        }, {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        }>>;
        sessionTimeout: z.ZodOptional<z.ZodNumber>;
        maxLoginAttempts: z.ZodOptional<z.ZodNumber>;
        lockoutDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sessionTimeout?: number | undefined;
        mfaEnforced?: boolean | undefined;
        ipAllowlist?: string[] | undefined;
        ssoEnabled?: boolean | undefined;
        ssoConfig?: {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        } | undefined;
        passwordPolicy?: {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        } | undefined;
        maxLoginAttempts?: number | undefined;
        lockoutDuration?: number | undefined;
    }, {
        sessionTimeout?: number | undefined;
        mfaEnforced?: boolean | undefined;
        ipAllowlist?: string[] | undefined;
        ssoEnabled?: boolean | undefined;
        ssoConfig?: {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        } | undefined;
        passwordPolicy?: {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        } | undefined;
        maxLoginAttempts?: number | undefined;
        lockoutDuration?: number | undefined;
    }>, {
        sessionTimeout?: number | undefined;
        mfaEnforced?: boolean | undefined;
        ipAllowlist?: string[] | undefined;
        ssoEnabled?: boolean | undefined;
        ssoConfig?: {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        } | undefined;
        passwordPolicy?: {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        } | undefined;
        maxLoginAttempts?: number | undefined;
        lockoutDuration?: number | undefined;
    }, {
        sessionTimeout?: number | undefined;
        mfaEnforced?: boolean | undefined;
        ipAllowlist?: string[] | undefined;
        ssoEnabled?: boolean | undefined;
        ssoConfig?: {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        } | undefined;
        passwordPolicy?: {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        } | undefined;
        maxLoginAttempts?: number | undefined;
        lockoutDuration?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        sessionTimeout?: number | undefined;
        mfaEnforced?: boolean | undefined;
        ipAllowlist?: string[] | undefined;
        ssoEnabled?: boolean | undefined;
        ssoConfig?: {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        } | undefined;
        passwordPolicy?: {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        } | undefined;
        maxLoginAttempts?: number | undefined;
        lockoutDuration?: number | undefined;
    };
}, {
    body: {
        sessionTimeout?: number | undefined;
        mfaEnforced?: boolean | undefined;
        ipAllowlist?: string[] | undefined;
        ssoEnabled?: boolean | undefined;
        ssoConfig?: {
            clientId: string;
            clientSecret: string;
            metadataUrl: string;
        } | undefined;
        passwordPolicy?: {
            minLength?: number | undefined;
            requireUppercase?: boolean | undefined;
            requireLowercase?: boolean | undefined;
            requireNumbers?: boolean | undefined;
            requireSpecialChars?: boolean | undefined;
            expiryDays?: number | undefined;
        } | undefined;
        maxLoginAttempts?: number | undefined;
        lockoutDuration?: number | undefined;
    };
}>;
export declare const testSSOConfigSchema: z.ZodObject<{
    body: z.ZodObject<{
        clientId: z.ZodString;
        clientSecret: z.ZodString;
        metadataUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        clientId: string;
        clientSecret: string;
        metadataUrl: string;
    }, {
        clientId: string;
        clientSecret: string;
        metadataUrl: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        clientId: string;
        clientSecret: string;
        metadataUrl: string;
    };
}, {
    body: {
        clientId: string;
        clientSecret: string;
        metadataUrl: string;
    };
}>;
//# sourceMappingURL=security.validator.d.ts.map