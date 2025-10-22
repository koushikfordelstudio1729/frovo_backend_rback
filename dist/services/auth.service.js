"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const models_1 = require("../models");
const jwt_util_1 = require("../utils/jwt.util");
class AuthService {
    async register(userData, createdBy) {
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
        const userResponse = user.toObject();
        const { password, mfaSecret, ...cleanUser } = userResponse;
        return {
            user: cleanUser,
            ...tokens
        };
    }
    async login(credentials) {
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
        await user.save();
        const tokens = (0, jwt_util_1.generateTokenPair)(user._id);
        const userResponse = user.toObject();
        const { password, mfaSecret, ...cleanUser } = userResponse;
        return {
            user: cleanUser,
            ...tokens
        };
    }
    async refreshToken(refreshToken) {
        try {
            const decoded = (0, jwt_util_1.verifyRefreshToken)(refreshToken);
            const user = await models_1.User.findById(decoded.id);
            if (!user || user.status !== models_1.UserStatus.ACTIVE) {
                throw new Error('Invalid refresh token');
            }
            return (0, jwt_util_1.generateTokenPair)(user._id);
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    async getCurrentUser(userId) {
        const user = await models_1.User.findById(userId)
            .populate('roles')
            .populate('departments')
            .select('-password -mfaSecret');
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