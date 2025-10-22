import { User, IUser, UserStatus } from '../models';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.util';
import { Types } from 'mongoose';

export interface AuthResponse {
  user: Partial<IUser>;
  accessToken: string;
  refreshToken: string;
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
  async register(userData: RegisterData, createdBy: Types.ObjectId): Promise<AuthResponse> {
    // Check if this is the first user (Super Admin)
    const existingUserCount = await User.countDocuments();
    
    if (existingUserCount > 0) {
      throw new Error('Super Admin already exists. Use regular user creation process.');
    }
    
    // Create the Super Admin user
    const user = await User.create({
      ...userData,
      createdBy,
      status: UserStatus.ACTIVE
    });
    
    // Generate tokens
    const tokens = generateTokenPair(user._id);
    
    // Return user without sensitive data
    const userResponse = user.toObject();
    const { password, mfaSecret, ...cleanUser } = userResponse;
    
    return {
      user: cleanUser,
      ...tokens
    };
  }
  
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password: loginPassword } = credentials;
    
    // Find user by email and include password
    const user = await User.findOne({ email })
      .select('+password')
      .populate('roles')
      .populate('departments');
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('Account is inactive or suspended');
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(loginPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const tokens = generateTokenPair(user._id);
    
    // Return user without sensitive data
    const userResponse = user.toObject();
    const { password, mfaSecret, ...cleanUser } = userResponse;
    
    return {
      user: cleanUser,
      ...tokens
    };
  }
  
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findById(decoded.id);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new token pair
      return generateTokenPair(user._id);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  async getCurrentUser(userId: string): Promise<Partial<IUser> | null> {
    const user = await User.findById(userId)
      .populate('roles')
      .populate('departments')
      .select('-password -mfaSecret');
    
    return user;
  }
  
  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }
  
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
  }
  
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    user.password = newPassword;
    await user.save();
  }
  
  async enableMFA(_userId: string): Promise<{ secret: string; qrCode: string }> {
    // This would integrate with an MFA library like speakeasy
    // For now, returning placeholder
    throw new Error('MFA not implemented yet');
  }
  
  async verifyMFA(_userId: string, _token: string): Promise<boolean> {
    // This would verify MFA token
    // For now, returning placeholder
    throw new Error('MFA not implemented yet');
  }
  
  async disableMFA(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      $unset: { mfaSecret: 1 }
    });
  }
}

export const authService = new AuthService();