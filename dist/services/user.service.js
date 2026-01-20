"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const models_1 = require("../models");
const email_service_1 = require("./email.service");
const logger_util_1 = require("../utils/logger.util");
class UserService {
    async createUser(userData, createdBy) {
        const existingUser = await models_1.User.findOne({ email: userData.email });
        if (existingUser) {
            throw new Error("User with this email already exists");
        }
        if (userData.departments && userData.departments.length > 0) {
            const departmentCount = await models_1.Department.countDocuments({
                _id: { $in: userData.departments },
            });
            if (departmentCount !== userData.departments.length) {
                throw new Error("One or more departments not found");
            }
        }
        if (userData.roles && userData.roles.length > 0) {
            const roleCount = await models_1.Role.countDocuments({
                _id: { $in: userData.roles },
            });
            if (roleCount !== userData.roles.length) {
                throw new Error("One or more roles not found");
            }
        }
        const user = await models_1.User.create({
            ...userData,
            createdBy,
            status: models_1.UserStatus.ACTIVE,
        });
        const emailConfigured = process.env["EMAIL_USER"] && process.env["EMAIL_PASS"];
        if (emailConfigured) {
            try {
                await email_service_1.emailService.sendWelcomeEmail(userData.email, userData.name, userData.password);
                logger_util_1.logger.info(`📧 Welcome email sent successfully to ${userData.email}`);
            }
            catch (emailError) {
                logger_util_1.logger.warn(`⚠️  Failed to send welcome email to ${userData.email}:`, emailError);
            }
        }
        else {
            logger_util_1.logger.info("📧 Email not configured, skipping welcome email");
        }
        return await this.getUserById(user._id.toString());
    }
    async getUserById(id) {
        const user = await models_1.User.findById(id)
            .populate("roles")
            .populate("departments")
            .populate("createdBy", "name email");
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    async updateUser(id, updateData) {
        const user = await models_1.User.findById(id);
        if (!user) {
            throw new Error("User not found");
        }
        if (updateData.departments && updateData.departments.length > 0) {
            const departmentCount = await models_1.Department.countDocuments({
                _id: { $in: updateData.departments },
            });
            if (departmentCount !== updateData.departments.length) {
                throw new Error("One or more departments not found");
            }
        }
        if (updateData.roles && updateData.roles.length > 0) {
            const roleCount = await models_1.Role.countDocuments({
                _id: { $in: updateData.roles },
            });
            if (roleCount !== updateData.roles.length) {
                throw new Error("One or more roles not found");
            }
        }
        const updatedUser = await models_1.User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        })
            .populate("roles")
            .populate("departments")
            .populate("createdBy", "name email");
        return updatedUser;
    }
    async updateUserStatus(id, status) {
        const user = await models_1.User.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
            .populate("roles")
            .populate("departments");
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    async deleteUser(id) {
        const user = await models_1.User.findById(id);
        if (!user) {
            throw new Error("User not found");
        }
        await models_1.User.findByIdAndUpdate(id, { status: models_1.UserStatus.INACTIVE });
    }
    async getUsers(query) {
        const { page, limit, search, role, department, status, sortBy, sortOrder } = query;
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
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
        const sort = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            models_1.User.find(filter)
                .populate("roles", "name key systemRole")
                .populate("departments", "name systemName")
                .populate("createdBy", "name email")
                .sort(sort)
                .skip(skip)
                .limit(limit),
            models_1.User.countDocuments(filter),
        ]);
        const pages = Math.ceil(total / limit);
        return {
            users,
            total,
            page,
            limit,
            pages,
        };
    }
    async assignRoles(userId, roleIds) {
        const roleCount = await models_1.Role.countDocuments({
            _id: { $in: roleIds },
        });
        if (roleCount !== roleIds.length) {
            throw new Error("One or more roles not found");
        }
        const user = await models_1.User.findByIdAndUpdate(userId, { $addToSet: { roles: { $each: roleIds } } }, { new: true })
            .populate("roles")
            .populate("departments");
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    async removeRole(userId, roleId) {
        const user = await models_1.User.findByIdAndUpdate(userId, { $pull: { roles: roleId } }, { new: true })
            .populate("roles")
            .populate("departments");
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    async getUserPermissions(userId) {
        const user = await models_1.User.findById(userId).populate("roles");
        if (!user) {
            throw new Error("User not found");
        }
        return await user.getPermissions();
    }
    async updatePassword(userId, newPassword) {
        const user = await models_1.User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        user.password = newPassword;
        await user.save();
    }
    async searchUsers(searchTerm, limit = 10) {
        return await models_1.User.find({
            $or: [
                { name: { $regex: searchTerm, $options: "i" } },
                { email: { $regex: searchTerm, $options: "i" } },
            ],
            status: models_1.UserStatus.ACTIVE,
        })
            .select("name email")
            .limit(limit);
    }
}
exports.userService = new UserService();
