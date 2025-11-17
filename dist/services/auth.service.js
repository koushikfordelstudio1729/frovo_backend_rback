"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const models_1 = require("../models");
const jwt_util_1 = require("../utils/jwt.util");
const email_service_1 = require("./email.service");
class AuthService {
    async register(userData, createdBy, deviceInfo) {
        const existingUserCount = await models_1.User.countDocuments();
        if (existingUserCount > 0) {
            throw new Error('Super Admin already exists. Use regular user creation process.');
        }
        const user = await models_1.User.create({
            ...userData,
            createdBy,
            status: models_1.UserStatus.ACTIVE
        });
        const tokens = (0, jwt_util_1.generateTokenPair)(user._id);
        await user.addRefreshToken(tokens.refreshToken, deviceInfo?.deviceInfo, deviceInfo?.ipAddress, deviceInfo?.userAgent);
        const userResponse = user.toObject();
        const { password, mfaSecret, refreshTokens, ...cleanUser } = userResponse;
        return {
            user: cleanUser,
            ...tokens
        };
    }
    async registerCustomer(userData, deviceInfo) {
        const existingUser = await models_1.User.findOne({ email: userData.email });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        const customerRole = await models_1.Role.findOne({ systemRole: models_1.SystemRole.CUSTOMER });
        if (!customerRole) {
            throw new Error('Customer role not found. Please contact administrator.');
        }
        const user = await models_1.User.create({
            ...userData,
            roles: [customerRole._id],
            status: models_1.UserStatus.ACTIVE,
            createdBy: null
        });
        const tokens = (0, jwt_util_1.generateTokenPair)(user._id);
        await user.addRefreshToken(tokens.refreshToken, deviceInfo?.deviceInfo, deviceInfo?.ipAddress, deviceInfo?.userAgent);
        try {
            await email_service_1.emailService.sendWelcomeEmail(userData.email, userData.name, userData.password);
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }
        const userResponse = user.toObject();
        const { password, mfaSecret, refreshTokens, ...cleanUser } = userResponse;
        return {
            user: cleanUser,
            ...tokens
        };
    }
    async login(credentials, deviceInfo) {
        const { email, password: loginPassword } = credentials;
        const user = await models_1.User.findOne({ email })
            .select('+password')
            .populate('roles')
            .populate('departments');
        if (!user) {
            throw new Error('Invalid credentials');
        }
        if (user.status !== models_1.UserStatus.ACTIVE) {
            throw new Error('Account is inactive or suspended');
        }
        const isPasswordValid = await user.comparePassword(loginPassword);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        user.lastLogin = new Date();
        const tokens = (0, jwt_util_1.generateTokenPair)(user._id);
        await user.addRefreshToken(tokens.refreshToken, deviceInfo?.deviceInfo, deviceInfo?.ipAddress, deviceInfo?.userAgent);
        const userResponse = user.toObject();
        const { password, mfaSecret, refreshTokens, ...cleanUser } = userResponse;
        return {
            user: cleanUser,
            ...tokens
        };
    }
    async refreshToken(refreshToken, deviceInfo) {
        try {
            const decoded = (0, jwt_util_1.verifyRefreshToken)(refreshToken);
            const user = await models_1.User.findById(decoded.id);
            if (!user || user.status !== models_1.UserStatus.ACTIVE) {
                throw new Error('Invalid refresh token');
            }
            if (!user.isRefreshTokenValid(refreshToken)) {
                throw new Error('Invalid or expired refresh token');
            }
            await user.removeRefreshToken(refreshToken);
            const newTokens = (0, jwt_util_1.generateTokenPair)(user._id);
            await user.addRefreshToken(newTokens.refreshToken, deviceInfo?.deviceInfo, deviceInfo?.ipAddress, deviceInfo?.userAgent);
            return newTokens;
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    async logout(userId, refreshToken) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (refreshToken) {
            await user.removeRefreshToken(refreshToken);
        }
        else {
            await user.clearAllRefreshTokens();
        }
    }
    async logoutFromAllDevices(userId) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        await user.clearAllRefreshTokens();
    }
    async getCurrentUser(userId) {
        const user = await models_1.User.findById(userId)
            .populate('roles')
            .populate('departments')
            .select('-password -mfaSecret -refreshTokens');
        return user;
    }
    async updateLastLogin(userId) {
        await models_1.User.findByIdAndUpdate(userId, { lastLogin: new Date() });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await models_1.User.findById(userId).select('+password');
        if (!user) {
            throw new Error('User not found');
        }
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        user.password = newPassword;
        await user.save();
    }
    async resetPassword(userId, newPassword) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.password = newPassword;
        await user.save();
    }
    async enableMFA(_userId) {
        throw new Error('MFA not implemented yet');
    }
    async verifyMFA(_userId, _token) {
        throw new Error('MFA not implemented yet');
    }
    async disableMFA(userId) {
        await models_1.User.findByIdAndUpdate(userId, {
            mfaEnabled: false,
            $unset: { mfaSecret: 1 }
        });
    }
}
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map