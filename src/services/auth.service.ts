import { User, IUser, UserStatus, Role, SystemRole } from "../models";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.util";
import { Types } from "mongoose";
import { emailService } from "./email.service";

import { logger } from "../utils/logger.util";
export interface AuthResponse {
  user: Partial<IUser>;
  accessToken: string;
  refreshToken: string;
}

export interface DeviceInfo {
  deviceInfo?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

class AuthService {
  async register(
    userData: RegisterData,
    createdBy: Types.ObjectId,
    deviceInfo?: DeviceInfo
  ): Promise<AuthResponse> {
    const existingUserCount = await User.countDocuments();

    if (existingUserCount > 0) {
      throw new Error("Super Admin already exists. Use regular user creation process.");
    }

    const user = await User.create({
      ...userData,
      createdBy,
      status: UserStatus.ACTIVE,
    });

    const tokens = generateTokenPair(user._id);

    await user.addRefreshToken(
      tokens.refreshToken,
      deviceInfo?.deviceInfo,
      deviceInfo?.ipAddress,
      deviceInfo?.userAgent
    );

    const userResponse = user.toObject();
    const { password, mfaSecret, refreshTokens, ...cleanUser } = userResponse;

    return {
      user: cleanUser,
      ...tokens,
    };
  }

  async registerCustomer(userData: RegisterData, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const customerRole = await Role.findOne({ systemRole: SystemRole.CUSTOMER });
    if (!customerRole) {
      throw new Error("Customer role not found. Please contact administrator.");
    }

    const user = await User.create({
      ...userData,
      roles: [customerRole._id],
      status: UserStatus.ACTIVE,
      createdBy: null,
    });

    const tokens = generateTokenPair(user._id);

    await user.addRefreshToken(
      tokens.refreshToken,
      deviceInfo?.deviceInfo,
      deviceInfo?.ipAddress,
      deviceInfo?.userAgent
    );

    try {
      await emailService.sendWelcomeEmail(userData.email, userData.name, userData.password);
    } catch (emailError) {
      logger.error("Failed to send welcome email:", emailError);
    }

    const userResponse = user.toObject();
    const { password, mfaSecret, refreshTokens, ...cleanUser } = userResponse;

    return {
      user: cleanUser,
      ...tokens,
    };
  }

  async login(credentials: LoginCredentials, deviceInfo?: DeviceInfo): Promise<AuthResponse> {
    const { email, password: loginPassword } = credentials;

    const user = await User.findOne({ email })
      .select("+password")
      .populate("roles")
      .populate("departments");

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error("Account is inactive or suspended");
    }

    const isPasswordValid = await user.comparePassword(loginPassword);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    user.lastLogin = new Date();

    const tokens = generateTokenPair(user._id);

    await user.addRefreshToken(
      tokens.refreshToken,
      deviceInfo?.deviceInfo,
      deviceInfo?.ipAddress,
      deviceInfo?.userAgent
    );

    const userResponse = user.toObject();
    const { password, mfaSecret, refreshTokens, ...cleanUser } = userResponse;

    return {
      user: cleanUser,
      ...tokens,
    };
  }

  async refreshToken(
    refreshToken: string,
    deviceInfo?: DeviceInfo
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new Error("Invalid refresh token");
      }

      if (!user.isRefreshTokenValid(refreshToken)) {
        throw new Error("Invalid or expired refresh token");
      }

      await user.removeRefreshToken(refreshToken);

      const newTokens = generateTokenPair(user._id);

      await user.addRefreshToken(
        newTokens.refreshToken,
        deviceInfo?.deviceInfo,
        deviceInfo?.ipAddress,
        deviceInfo?.userAgent
      );

      return newTokens;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (refreshToken) {
      await user.removeRefreshToken(refreshToken);
    } else {
      await user.clearAllRefreshTokens();
    }
  }

  async logoutFromAllDevices(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    await user.clearAllRefreshTokens();
  }

  async getCurrentUser(userId: string): Promise<Partial<IUser> | null> {
    const user = await User.findById(userId)
      .populate("roles")
      .populate("departments")
      .select("-password -mfaSecret -refreshTokens");

    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new Error("User not found");
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    user.password = newPassword;
    await user.save();
  }

  async enableMFA(_userId: string): Promise<{ secret: string; qrCode: string }> {
    throw new Error("MFA not implemented yet");
  }

  async verifyMFA(_userId: string, _token: string): Promise<boolean> {
    throw new Error("MFA not implemented yet");
  }

  async disableMFA(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      $unset: { mfaSecret: 1 },
    });
  }
}

export const authService = new AuthService();
