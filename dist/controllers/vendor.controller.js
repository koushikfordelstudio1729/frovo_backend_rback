"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorController = void 0;
const vendor_service_1 = require("../services/vendor.service");
const auditTrail_service_1 = require("../services/auditTrail.service");
const vendorService = new vendor_service_1.VendorService();
const auditTrailService = new auditTrail_service_1.AuditTrailService();
class VendorController {
    static getLoggedInUser(req) {
        const user = req.user;
        if (!user || !user._id) {
            throw new Error('User authentication required');
        }
        return {
            _id: user._id,
            roles: user.roles || [],
            email: user.email || ''
        };
    }
    static async createCompany(req, res) {
        try {
            const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';
            const { registered_company_name, company_address, office_email, legal_entity_structure, cin, gst_number, date_of_incorporation, corporate_website, directory_signature_name, din, company_status, risk_rating } = req.body;
            let parsedDate;
            if (date_of_incorporation) {
                parsedDate = new Date(date_of_incorporation);
                if (isNaN(parsedDate.getTime())) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid date format for date_of_incorporation. Use ISO format (YYYY-MM-DD)'
                    });
                    return;
                }
            }
            const companyData = {
                registered_company_name,
                company_address,
                office_email,
                legal_entity_structure,
                cin,
                gst_number,
                date_of_incorporation: parsedDate,
                corporate_website,
                directory_signature_name,
                din,
                company_status,
                risk_rating
            };
            const newCompany = await vendor_service_1.VendorService.createCompanyService(companyData, userId, userEmail, userRole, req);
            res.status(201).json({
                success: true,
                message: 'Company created successfully',
                data: newCompany
            });
        }
        catch (error) {
            console.error('Error creating company:', error);
            if (error instanceof Error) {
                if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
                    res.status(409).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (error.message.includes('Invalid') || error.message.includes('Missing')) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async getAllCompanies(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
            const result = await vendor_service_1.VendorService.getAllCompaniesService({
                page: Number(page),
                limit: Number(limit),
                search: search,
                sortBy: sortBy,
                sortOrder: sortOrder
            });
            res.status(200).json({
                success: true,
                message: 'Companies retrieved successfully',
                data: result.data,
                pagination: result.pagination
            });
        }
        catch (error) {
            console.error('Error fetching companies:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async getCompanyById(req, res) {
        try {
            const { cin } = req.params;
            const company = await vendor_service_1.VendorService.getCompanyByIdService(cin);
            res.status(200).json({
                success: true,
                message: 'Company retrieved successfully',
                data: company
            });
        }
        catch (error) {
            console.error('Error fetching company:', error);
            if (error instanceof Error) {
                if (error.message.includes('Invalid') || error.message.includes('not found')) {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async updateCompany(req, res) {
        try {
            const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';
            const { cin } = req.params;
            const updateData = req.body;
            if (updateData.date_of_incorporation) {
                const parsedDate = new Date(updateData.date_of_incorporation);
                if (isNaN(parsedDate.getTime())) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid date format for date_of_incorporation. Use ISO format (YYYY-MM-DD)'
                    });
                    return;
                }
                updateData.date_of_incorporation = parsedDate;
            }
            const updatedCompany = await vendor_service_1.VendorService.updateCompanyService(cin, updateData, userId, userEmail, userRole, req);
            if (!updatedCompany) {
                res.status(404).json({
                    success: false,
                    message: 'Company not found'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Company updated successfully',
                data: updatedCompany
            });
        }
        catch (error) {
            console.error('Error updating company:', error);
            if (error instanceof Error) {
                if (error.message.includes('Invalid') || error.message.includes('not found')) {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (error.message.includes('already exists')) {
                    res.status(409).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
                if (error.message.includes('Invalid') || error.message.includes('cannot be')) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async deleteCompany(req, res) {
        try {
            const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';
            const { cin } = req.params;
            const deletedCompany = await vendor_service_1.VendorService.deleteCompanyService(cin, userId, userEmail, userRole, req);
            res.status(200).json({
                success: true,
                message: 'Company deleted successfully',
                data: deletedCompany
            });
        }
        catch (error) {
            console.error('Error deleting company:', error);
            if (error instanceof Error) {
                if (error.message.includes('Invalid') || error.message.includes('not found')) {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async searchCompanies(req, res) {
        try {
            const { q, limit = 10 } = req.query;
            if (!q || typeof q !== 'string' || q.trim() === '') {
                res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
                return;
            }
            const companies = await vendor_service_1.VendorService.searchCompaniesService(q, Number(limit));
            res.status(200).json({
                success: true,
                message: 'Companies search completed',
                data: companies
            });
        }
        catch (error) {
            console.error('Error searching companies:', error);
            if (error instanceof Error) {
                if (error.message.includes('required')) {
                    res.status(400).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async checkCompanyExists(req, res) {
        try {
            const { cin } = req.params;
            const exists = await vendor_service_1.VendorService.checkCompanyExists(cin);
            res.status(200).json({
                success: true,
                message: 'Company existence checked',
                data: { exists }
            });
        }
        catch (error) {
            console.error('Error checking company existence:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getCommonDashboard(req, res) {
        try {
            console.log('📊 Common Dashboard endpoint called');
            const { roles } = VendorController.getLoggedInUser(req);
            console.log('👥 User Roles:', roles.map(r => r.key));
            if (!roles.some(role => ['super_admin', 'vendor_admin'].includes(role.key))) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This dashboard is only for Super Admin and Vendor Admin.'
                });
            }
            const filters = {
                verification_status: req.query.verification_status,
                risk_rating: req.query.risk_rating,
                vendor_category: req.query.vendor_category,
                search: req.query.search,
                company_search: req.query.company_search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10
            };
            console.log('🔍 Filters:', filters);
            const dashboardData = await vendorService.getCommonDashboard(filters);
            console.log('✅ Common dashboard data retrieved:', {
                total_companies: dashboardData.total_companies,
                total_vendors: dashboardData.total_vendors,
                companies_count: dashboardData.companies?.length || 0,
                vendors_count: dashboardData.vendors?.length || 0
            });
            res.status(200).json({
                success: true,
                message: 'Common dashboard data retrieved successfully',
                data: dashboardData
            });
        }
        catch (error) {
            console.error('❌ Error fetching common dashboard:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getSuperAdminVendorManagement(req, res) {
        try {
            console.log('👑 Super Admin Vendor Management Dashboard endpoint called');
            const { roles } = VendorController.getLoggedInUser(req);
            console.log('👥 User Roles:', roles.map(r => r.key));
            if (!roles.some(role => role.key === 'super_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This dashboard is only for Super Admin.'
                });
            }
            const filters = {
                verification_status: req.query.verification_status,
                risk_rating: req.query.risk_rating,
                vendor_category: req.query.vendor_category,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10
            };
            console.log('🔍 Filters:', filters);
            const dashboardData = await vendorService.getSuperAdminVendorManagementDashboard(filters);
            console.log('✅ Super admin vendor management data retrieved:', {
                total_vendors: dashboardData.total_vendors,
                pending_approvals: dashboardData.pending_approvals,
                vendors_count: dashboardData.vendors?.length || 0
            });
            res.status(200).json({
                success: true,
                message: 'Super admin vendor management dashboard data retrieved successfully',
                data: dashboardData
            });
        }
        catch (error) {
            console.error('❌ Error fetching super admin vendor management dashboard:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getAllVendorsForSuperAdmin(req, res) {
        try {
            const { roles } = VendorController.getLoggedInUser(req);
            if (!roles.some(role => role.key === 'super_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only Super Admin can access this endpoint'
                });
            }
            const filters = {
                verification_status: req.query.verification_status,
                risk_rating: req.query.risk_rating,
                vendor_category: req.query.vendor_category,
                created_by: req.query.created_by,
                search: req.query.search,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10
            };
            const result = await vendorService.getAllVendorsForSuperAdmin(filters);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getVendorStatistics(req, res) {
        try {
            const { roles } = VendorController.getLoggedInUser(req);
            if (!roles.some(role => role.key === 'super_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only Super Admin can access this endpoint'
                });
            }
            const statistics = await vendorService.getVendorStatistics();
            res.status(200).json({
                success: true,
                data: statistics
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getPendingApprovals(req, res) {
        try {
            const { roles } = VendorController.getLoggedInUser(req);
            if (!roles.some(role => role.key === 'super_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only Super Admin can access pending approvals'
                });
            }
            const pendingApprovals = await vendorService.getPendingApprovals();
            res.status(200).json({
                success: true,
                data: pendingApprovals
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async createCompleteVendor(req, res) {
        try {
            const { _id: createdBy, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            if (!roles.some(role => ['super_admin', 'vendor_admin'].includes(role.key))) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions to create vendors'
                });
            }
            const vendor = await vendorService.createCompleteVendor(req.body, createdBy, userEmail, userRole, req);
            res.status(201).json({
                success: true,
                message: 'Vendor created successfully',
                data: vendor
            });
        }
        catch (error) {
            console.error('Error creating vendor:', error);
            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('validation failed') || error.message.includes('is required')) {
                return res.status(422).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async createBulkVendors(req, res) {
        try {
            const { _id: createdBy, roles } = VendorController.getLoggedInUser(req);
            const { vendors } = req.body;
            if (!Array.isArray(vendors) || vendors.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendors array is required and cannot be empty'
                });
            }
            if (vendors.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot process more than 50 vendors at once'
                });
            }
            const result = await vendorService.createBulkVendors(vendors, createdBy);
            res.status(207).json({
                success: true,
                message: `Processed ${vendors.length} vendors. ${result.successful.length} successful, ${result.failed.length} failed.`,
                data: result
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    static async getVendorsByCompany(req, res) {
        try {
            const { cin } = req.params;
            const { page = 1, limit = 10, search, verification_status, risk_rating, vendor_category } = req.query;
            if (!cin) {
                res.status(400).json({
                    success: false,
                    message: 'Company registration number is required'
                });
                return;
            }
            const result = await vendor_service_1.VendorService.getVendorsByCompanyService(cin, {
                page: Number(page),
                limit: Number(limit),
                search: search,
                verification_status: verification_status,
                risk_rating: risk_rating,
                vendor_category: vendor_category
            });
            res.status(200).json({
                success: true,
                message: 'Vendors retrieved successfully',
                data: result
            });
        }
        catch (error) {
            console.error('Error fetching vendors by company:', error);
            if (error instanceof Error) {
                if (error.message.includes('Company not found')) {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    static async getCompanyWithVendorStats(req, res) {
        try {
            const { cin } = req.params;
            const result = await vendor_service_1.VendorService.getCompanyWithVendorStatsService(cin);
            res.status(200).json({
                success: true,
                message: 'Company with vendor statistics retrieved successfully',
                data: result
            });
        }
        catch (error) {
            console.error('Error fetching company with vendor stats:', error);
            if (error instanceof Error) {
                if (error.message.includes('Company not found')) {
                    res.status(404).json({
                        success: false,
                        message: error.message
                    });
                    return;
                }
            }
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getVendorById(req, res) {
        try {
            const { id } = req.params;
            const vendor = await vendorService.getVendorById(id);
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                data: vendor
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getVendorByVendorId(req, res) {
        try {
            const { vendorId } = req.params;
            const vendor = await vendorService.getVendorByVendorId(vendorId);
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                data: vendor
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getMyVendorProfile(req, res) {
        try {
            const { _id: userId } = VendorController.getLoggedInUser(req);
            const profile = await vendorService.getMyVendorProfile(userId);
            res.status(200).json({
                success: true,
                message: 'Vendor profile retrieved successfully',
                data: profile
            });
        }
        catch (error) {
            console.error('Error fetching vendor profile:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getVendorForEdit(req, res) {
        try {
            const { id } = req.params;
            const { _id: userId, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const vendor = await vendorService.getVendorForEdit(id, userId, userRole);
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                data: vendor
            });
        }
        catch (error) {
            if (error.message.includes('You can only access')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getAllVendors(req, res) {
        try {
            const filters = {
                verification_status: req.query.verification_status,
                risk_rating: req.query.risk_rating,
                vendor_category: req.query.vendor_category,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10
            };
            const result = await vendorService.getAllVendors(filters);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async updateVendor(req, res) {
        try {
            const { id } = req.params;
            const { _id: userId, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const updatedVendor = await vendorService.updateVendor(id, req.body, userRole, userId, userEmail, req);
            if (!updatedVendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'Vendor updated successfully',
                data: updatedVendor
            });
        }
        catch (error) {
            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Only Super Admin')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async updateVendorForAdmin(req, res) {
        try {
            const { id } = req.params;
            const { _id: userId, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const updatedVendor = await vendorService.updateVendorForAdmin(id, req.body, userId, userRole);
            if (!updatedVendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'Vendor updated successfully',
                data: updatedVendor
            });
        }
        catch (error) {
            if (error.message.includes('You can only update') || error.message.includes('Only Super Admin')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('already exists')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async updateVendorVerification(req, res) {
        try {
            const { id } = req.params;
            const { verification_status, notes } = req.body;
            const { _id: verifiedBy, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            if (!['verified', 'rejected', 'pending'].includes(verification_status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification status. Must be: verified, rejected, or pending'
                });
            }
            const updatedVendor = await vendorService.updateVendorVerification(id, verification_status, verifiedBy, userRole, userEmail, notes, req);
            res.status(200).json({
                success: true,
                message: `Vendor status updated to ${verification_status}`,
                data: updatedVendor
            });
        }
        catch (error) {
            if (error.message.includes('Only Super Admin')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async quickVerifyOrRejectVendor(req, res) {
        try {
            const { id } = req.params;
            const action = req.path.split('/').pop();
            const { _id: verifiedBy, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            if (userRole !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only Super Admin can verify or reject vendors'
                });
            }
            let verificationStatus;
            let actionDescription;
            if (action === 'quick-verify') {
                verificationStatus = 'verified';
                actionDescription = 'Vendor quickly verified via quick-verify route';
            }
            else if (action === 'quick-reject') {
                verificationStatus = 'rejected';
                actionDescription = 'Vendor quickly rejected via quick-reject route';
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Use quick-verify or quick-reject'
                });
            }
            const updatedVendor = await vendorService.quickVerifyOrRejectVendor(id, verificationStatus, verifiedBy, userEmail, userRole, actionDescription, req);
            res.status(200).json({
                success: true,
                message: `Vendor ${verificationStatus} successfully`,
                data: updatedVendor
            });
        }
        catch (error) {
            console.error('Error in quick verify/reject:', error);
            if (error.message.includes('Only Super Admin')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message.includes('Vendor not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async toggleVendorVerification(req, res) {
        try {
            const { id } = req.params;
            const { _id: verifiedBy, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const updatedVendor = await vendorService.toggleVendorVerification(id, verifiedBy, userRole);
            res.status(200).json({
                success: true,
                message: `Vendor status toggled to ${updatedVendor.verification_status}`,
                data: updatedVendor
            });
        }
        catch (error) {
            if (error.message.includes('Only Super Admin')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async bulkUpdateVendorVerification(req, res) {
        try {
            const { vendor_ids, verification_status, rejection_reason } = req.body;
            const { _id: verifiedBy, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            if (!['verified', 'rejected'].includes(verification_status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification status'
                });
            }
            if (!Array.isArray(vendor_ids) || vendor_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor IDs array is required'
                });
            }
            const result = await vendorService.bulkUpdateVendorVerification(vendor_ids, verification_status, verifiedBy, userRole, rejection_reason);
            res.status(200).json({
                success: true,
                message: `Bulk verification completed. ${result.successful.length} successful, ${result.failed.length} failed.`,
                data: result
            });
        }
        catch (error) {
            if (error.message.includes('Only Super Admin')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async deleteVendor(req, res) {
        try {
            const { id } = req.params;
            const { _id: userId, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const result = await vendorService.deleteVendor(id, userId, userEmail, userRole, req);
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'Vendor deleted successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async deleteVendorForAdmin(req, res) {
        try {
            const { id } = req.params;
            const { _id: userId, roles } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const result = await vendorService.deleteVendorForAdmin(id, userId, userRole);
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            res.status(200).json({
                success: true,
                message: 'Vendor deleted successfully'
            });
        }
        catch (error) {
            if (error.message.includes('You can only delete')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async generateTestAuditData(req, res) {
        try {
            const { _id: userId, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            await auditTrailService.createAuditRecord({
                user: userId,
                user_email: userEmail,
                user_role: userRole,
                action: 'login',
                action_description: 'User logged into the system',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditTrailService.createAuditRecord({
                user: userId,
                user_email: userEmail,
                user_role: userRole,
                action: 'view',
                action_description: 'Viewed vendor dashboard',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            res.status(200).json({
                success: true,
                message: 'Test audit data generated successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getVendorAuditTrail(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const vendor = await vendorService.getVendorById(id);
            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            const auditData = await auditTrailService.getVendorAuditTrails(id, Number(page), Number(limit));
            res.status(200).json({
                success: true,
                message: 'Vendor audit trail retrieved successfully',
                data: auditData
            });
        }
        catch (error) {
            console.error('Error fetching vendor audit trail:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getCompanyAuditTrail(req, res) {
        try {
            const { cin } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const company = await vendor_service_1.VendorService.getCompanyByIdService(cin);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found'
                });
            }
            const auditData = await auditTrailService.getCompanyAuditTrails(company._id.toString(), Number(page), Number(limit));
            res.status(200).json({
                success: true,
                message: 'Company audit trail retrieved successfully',
                data: auditData
            });
        }
        catch (error) {
            console.error('Error fetching company audit trail:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async uploadVendorDocument(req, res) {
        try {
            const { id } = req.params;
            const { document_type, expiry_date } = req.body;
            const { _id: userId, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }
            if (!document_type) {
                return res.status(400).json({
                    success: false,
                    message: 'Document type is required'
                });
            }
            const expiryDate = expiry_date ? new Date(expiry_date) : undefined;
            const vendor = await vendorService.uploadVendorDocument(id, req.file, document_type, expiryDate, userId, userEmail, userRole, req);
            res.status(200).json({
                success: true,
                message: 'Document uploaded successfully',
                data: vendor
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async deleteVendorDocument(req, res) {
        try {
            const { id, documentId } = req.params;
            const { _id: userId, roles, email: userEmail } = VendorController.getLoggedInUser(req);
            const userRole = roles[0]?.key;
            const vendor = await vendorService.deleteVendorDocument(id, documentId, userId, userEmail, userRole, req);
            res.status(200).json({
                success: true,
                message: 'Document deleted successfully',
                data: vendor
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getVendorDocuments(req, res) {
        try {
            const { id } = req.params;
            const documents = await vendorService.getVendorDocuments(id);
            res.status(200).json({
                success: true,
                data: documents
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    async getVendorDocument(req, res) {
        try {
            const { id, documentId } = req.params;
            const document = await vendorService.getVendorDocument(id, documentId);
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }
            res.status(200).json({
                success: true,
                data: document
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.VendorController = VendorController;
