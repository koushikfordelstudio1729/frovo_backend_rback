import { User, IUser, UserStatus, Role, Department } from '../models';
import { Types } from 'mongoose';
import { emailService } from './email.service';
import { logger } from '../utils/logger.util';

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  departments?: string[];
  roles?: string[];
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  departments?: string[];
  roles?: string[];
}

export interface UserQuery {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  department?: string;
  status?: UserStatus;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedUsers {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

class UserService {
  async createUser(userData: CreateUserData, createdBy: Types.ObjectId): Promise<IUser> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Validate departments
    if (userData.departments && userData.departments.length > 0) {
      const departmentCount = await Department.countDocuments({
        _id: { $in: userData.departments }
      });
      if (departmentCount !== userData.departments.length) {
        throw new Error('One or more departments not found');
      }
    }
    
    // Validate roles
    if (userData.roles && userData.roles.length > 0) {
      const roleCount = await Role.countDocuments({
        _id: { $in: userData.roles }
      });
      if (roleCount !== userData.roles.length) {
        throw new Error('One or more roles not found');
      }
    }
    
    const user = await User.create({
      ...userData,
      createdBy,
      status: UserStatus.ACTIVE
    });
    
    // Send welcome email (if email is configured)
    const emailConfigured = process.env['EMAIL_USER'] && process.env['EMAIL_PASS'];
    if (emailConfigured) {
      try {
        await emailService.sendWelcomeEmail(userData.email, userData.name, userData.password);
        logger.info(`📧 Welcome email sent successfully to ${userData.email}`);
      } catch (emailError) {
        logger.warn(`⚠️  Failed to send welcome email to ${userData.email}:`, emailError);
        // Don't throw error - user creation should succeed even if email fails
      }
    } else {
      logger.info('📧 Email not configured, skipping welcome email');
    }
    
    return await this.getUserById(user._id.toString());
  }
  
  async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id)
      .populate('roles')
      .populate('departments')
      .populate('createdBy', 'name email');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  async updateUser(id: string, updateData: UpdateUserData): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Validate departments
    if (updateData.departments && updateData.departments.length > 0) {
      const departmentCount = await Department.countDocuments({
        _id: { $in: updateData.departments }
      });
      if (departmentCount !== updateData.departments.length) {
        throw new Error('One or more departments not found');
      }
    }
    
    // Validate roles
    if (updateData.roles && updateData.roles.length > 0) {
      const roleCount = await Role.countDocuments({
        _id: { $in: updateData.roles }
      });
      if (roleCount !== updateData.roles.length) {
        throw new Error('One or more roles not found');
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('roles')
      .populate('departments')
      .populate('createdBy', 'name email');
    
    return updatedUser!;
  }
  
  async updateUserStatus(id: string, status: UserStatus): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('roles')
      .populate('departments');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  async deleteUser(id: string): Promise<void> {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Soft delete by setting status to inactive
    await User.findByIdAndUpdate(id, { status: UserStatus.INACTIVE });
  }
  
  async getUsers(query: UserQuery): Promise<PaginatedUsers> {
    const {
      page,
      limit,
      search,
      role,
      department,
      status,
      sortBy,
      sortOrder
    } = query;
    
    // Build filter
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (role) {
      filter.roles = { $in: [role] };
    }
    
    if (department) {
      filter.departments = { $in: [department] };
    }
    
    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Calculate skip
    const skip = (page - 1) * limit;
    
    // Execute queries
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('roles', 'name key systemRole')
        .populate('departments', 'name systemName')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      users,
      total,
      page,
      limit,
      pages
    };
  }
  
  async assignRoles(userId: string, roleIds: string[]): Promise<IUser> {
    // Validate roles exist
    const roleCount = await Role.countDocuments({
      _id: { $in: roleIds }
    });
    if (roleCount !== roleIds.length) {
      throw new Error('One or more roles not found');
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { roles: { $each: roleIds } } },
      { new: true }
    )
      .populate('roles')
      .populate('departments');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  async removeRole(userId: string, roleId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { roles: roleId } },
      { new: true }
    )
      .populate('roles')
      .populate('departments');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await User.findById(userId).populate('roles');
    if (!user) {
      throw new Error('User not found');
    }
    
    return await user.getPermissions();
  }
  
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.password = newPassword;
    await user.save();
  }
  
  async searchUsers(searchTerm: string, limit = 10): Promise<IUser[]> {
    return await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ],
      status: UserStatus.ACTIVE
    })
      .select('name email')
      .limit(limit);
  }
}

export const userService = new UserService();