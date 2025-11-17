import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        email?: string;
        password?: string;
    }, {
        name?: string;
        email?: string;
        password?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        name?: string;
        email?: string;
        password?: string;
    };
}, {
    body?: {
        name?: string;
        email?: string;
        password?: string;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email?: string;
        password?: string;
    }, {
        email?: string;
        password?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        email?: string;
        password?: string;
    };
}, {
    body?: {
        email?: string;
        password?: string;
    };
}>;
export declare const changePasswordSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
        confirmPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }, {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>, {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }, {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    };
}, {
    body?: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    };
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email?: string;
    }, {
        email?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        email?: string;
    };
}, {
    body?: {
        email?: string;
    };
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        token: z.ZodString;
        password: z.ZodString;
        confirmPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password?: string;
        token?: string;
        confirmPassword?: string;
    }, {
        password?: string;
        token?: string;
        confirmPassword?: string;
    }>, {
        password?: string;
        token?: string;
        confirmPassword?: string;
    }, {
        password?: string;
        token?: string;
        confirmPassword?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        password?: string;
        token?: string;
        confirmPassword?: string;
    };
}, {
    body?: {
        password?: string;
        token?: string;
        confirmPassword?: string;
    };
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    body: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken?: string;
    }, {
        refreshToken?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        refreshToken?: string;
    };
}, {
    body?: {
        refreshToken?: string;
    };
}>;
//# sourceMappingURL=auth.validator.d.ts.map