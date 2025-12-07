import mongoose, { Types } from 'mongoose';
import { 
  VendorCreate, 
  IVendorCreate, 
  VendorDashboard, 
  IVendorDashboard, 
  IVendorDocument, 
  ICompanyCreate, 
  CompanyCreate  // Add this import
} from '../models/Vendor.model';
import { AuditTrailService } from './auditTrail.service';
import { DocumentUploadService } from './documentUpload.service';

export class VendorService {
  private auditTrailService = new AuditTrailService();
  private documentUploadService = new DocumentUploadService();

  /**
   * Create a new company
   */
  public static async createCompanyService(data: {
    registered_company_name: string;
    company_address: string;
    office_email: string;
    legal_entity_structure: string;
    company_registration_number: string;
    date_of_incorporation: Date;
    corporate_website?: string;
    directory_signature_name: string;
    din: string;
  }) {
    const {
      registered_company_name,
      company_address,
      office_email,
      legal_entity_structure,
      company_registration_number,
      date_of_incorporation,
      corporate_website,
      directory_signature_name,
      din
    } = data;

    // Validate required fields
    const requiredFields = [
      'registered_company_name',
      'company_address',
      'office_email',
      'legal_entity_structure',
      'company_registration_number',
      'date_of_incorporation',
      'directory_signature_name',
      'din'
    ];

    const missingFields = requiredFields.filter(field => !data[field as keyof typeof data]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(office_email)) {
      throw new Error('Invalid email format');
    }

    // Validate date
    const incorporationDate = new Date(date_of_incorporation);
    if (isNaN(incorporationDate.getTime())) {
      throw new Error('Invalid date format for date_of_incorporation');
    }

    // Check if date is not in the future
    const today = new Date();
    if (incorporationDate > today) {
      throw new Error('Date of incorporation cannot be in the future');
    }

    // Check for unique constraints
    const existingCompanies = await Promise.all([
      CompanyCreate.findOne({ office_email }),
      CompanyCreate.findOne({ company_registration_number }),
      CompanyCreate.findOne({ din })
    ]);

    const errors = [];
    if (existingCompanies[0]) errors.push('Company with this email already exists');
    if (existingCompanies[1]) errors.push('Company with this registration number already exists');
    if (existingCompanies[2]) errors.push('Company with this DIN already exists');

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    // Validate corporate website if provided
    if (corporate_website) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(corporate_website)) {
        throw new Error('Invalid website URL format');
      }
    }

    // Create new company
    const newCompany = new CompanyCreate({
      registered_company_name,
      company_address,
      office_email: office_email.toLowerCase(),
      legal_entity_structure,
      company_registration_number,
      date_of_incorporation: incorporationDate,
      corporate_website,
      directory_signature_name,
      din
    });

    const savedCompany = await newCompany.save();
    
    // Convert to plain object and remove sensitive/technical fields
    const companyObj = savedCompany.toObject();
    delete companyObj.__v;
    
    return companyObj;
  }

  /**
   * Get all companies with pagination
   */
  public static async getAllCompaniesService(query: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter: any = {};

    if (search) {
      filter.$or = [
        { registered_company_name: { $regex: search, $options: 'i' } },
        { office_email: { $regex: search, $options: 'i' } },
        { company_registration_number: { $regex: search, $options: 'i' } },
        { din: { $regex: search, $options: 'i' } },
        { directory_signature_name: { $regex: search, $options: 'i' } }
      ];
    }

    const sort: any = {};
    sort[String(sortBy)] = sortOrder === 'asc' ? 1 : -1;

    const [companies, totalCount] = await Promise.all([
      CompanyCreate.find(filter)
        .select('-__v') // Exclude __v field
        .sort(sort)
        .skip(skip)
        .limit(limitNum),

      CompanyCreate.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      data: companies,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
        limit: limitNum
      }
    };
  }

  /**
   * Get company by ID
   */
  public static async getCompanyByIdService(id: string) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid company ID format');
    }

    const company = await CompanyCreate.findById(id).select('-__v');
    
    if (!company) {
      throw new Error('Company not found');
    }

    return company;
  }

  /**
   * Update company by ID
   */
  public static async updateCompanyService(id: string, data: Partial<{
    registered_company_name: string;
    company_address: string;
    office_email: string;
    legal_entity_structure: string;
    company_registration_number: string;
    date_of_incorporation: Date;
    corporate_website: string;
    directory_signature_name: string;
    din: string;
  }>) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid company ID format');
    }

    // Check if company exists
    const existingCompany = await CompanyCreate.findById(id);
    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Validate email if being updated
    if (data.office_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.office_email)) {
        throw new Error('Invalid email format');
      }

      // Check for duplicate email
      const companyWithSameEmail = await CompanyCreate.findOne({
        office_email: data.office_email.toLowerCase(),
        _id: { $ne: id }
      });
      
      if (companyWithSameEmail) {
        throw new Error('Company with this email already exists');
      }
      
      data.office_email = data.office_email.toLowerCase();
    }

    // Validate date if being updated
    if (data.date_of_incorporation) {
      const incorporationDate = new Date(data.date_of_incorporation);
      if (isNaN(incorporationDate.getTime())) {
        throw new Error('Invalid date format for date_of_incorporation');
      }

      const today = new Date();
      if (incorporationDate > today) {
        throw new Error('Date of incorporation cannot be in the future');
      }
      
      data.date_of_incorporation = incorporationDate;
    }

    // Validate registration number if being updated
    if (data.company_registration_number) {
      const companyWithSameRegNo = await CompanyCreate.findOne({
        company_registration_number: data.company_registration_number,
        _id: { $ne: id }
      });
      
      if (companyWithSameRegNo) {
        throw new Error('Company with this registration number already exists');
      }
    }

    // Validate DIN if being updated
    if (data.din) {
      const companyWithSameDIN = await CompanyCreate.findOne({
        din: data.din,
        _id: { $ne: id }
      });
      
      if (companyWithSameDIN) {
        throw new Error('Company with this DIN already exists');
      }
    }

    // Validate website if being updated
    if (data.corporate_website) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(data.corporate_website)) {
        throw new Error('Invalid website URL format');
      }
    }

    // Update company
    const updatedCompany = await CompanyCreate.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    ).select('-__v');

    return updatedCompany;
  }

  /**
   * Delete company by ID
   */
  public static async deleteCompanyService(id: string) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid company ID format');
    }

    const deletedCompany = await CompanyCreate.findByIdAndDelete(id);
    
    if (!deletedCompany) {
      throw new Error('Company not found');
    }

    return deletedCompany;
  }

  /**
   * Check if company exists by ID
   */
  public static async checkCompanyExists(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    const company = await CompanyCreate.findById(id);
    return !!company;
  }

  /**
   * Search companies by name or email
   */
  public static async searchCompaniesService(searchTerm: string, limit: number = 10) {
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Search term is required');
    }

    const companies = await CompanyCreate.find({
      $or: [
        { registered_company_name: { $regex: searchTerm, $options: 'i' } },
        { office_email: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .select('registered_company_name office_email company_registration_number')
    .limit(limit)
    .sort({ registered_company_name: 1 });

    return companies;
  }
  // Create Complete Vendor with Audit Trail
  async createCompleteVendor(
  vendorData: Partial<IVendorCreate>,
  createdBy: Types.ObjectId,
  userEmail: string,
  userRole: string,
  req?: any
): Promise<IVendorCreate> {
  try {
    // Validate vendor data
    VendorValidationService.validateCompleteVendorData(vendorData);

    // ===== IMPORTANT: Validate company_registration_number =====
    if (vendorData.company_registration_number) {
      const companyExists = await CompanyCreate.findOne({
        company_registration_number: vendorData.company_registration_number
      });

      if (!companyExists) {
        throw new Error(`Company with registration number "${vendorData.company_registration_number}" does not exist. Please create the company first.`);
      }

      // Optionally, you can also link the company ID to the vendor
      // vendorData.company = companyExists._id;
    } else {
      throw new Error('Company registration number is required');
    }
    // ===== END VALIDATION =====

    // Check for duplicate vendor email
    const existingVendorByEmail = await VendorCreate.findOne({
      vendor_email: vendorData.vendor_email?.toLowerCase()
    });

    if (existingVendorByEmail) {
      throw new Error('Vendor with this email already exists');
    }

    // Generate vendor ID if not provided
    if (!vendorData.vendor_id) {
      vendorData.vendor_id = this.generateVendorId();
    } else {
      // Check for duplicate vendor ID if provided
      const existingVendorById = await VendorCreate.findOne({
        vendor_id: vendorData.vendor_id
      });

      if (existingVendorById) {
        throw new Error('Vendor with this ID already exists');
      }
    }

    // Prepare vendor data with defaults
    const completeVendorData = {
      ...vendorData,
      createdBy,
      verification_status: 'pending',
      verified_by: undefined
    };

    const vendor = new VendorCreate(completeVendorData);
    const savedVendor = await vendor.save();

    // Create audit trail record
    await this.createVendorAuditRecord(
      createdBy,
      userEmail,
      userRole,
      'create',
      `Created new vendor: ${savedVendor.vendor_name}`,
      savedVendor._id as Types.ObjectId,
      savedVendor.vendor_name,
      savedVendor.vendor_id,
      undefined,
      savedVendor.toObject(),
      req
    );

    return savedVendor;
  } catch (error: any) {
    throw new Error(`Error creating vendor: ${error.message}`);
  }
}
  // Enhanced Update Vendor with Audit Trail
  async updateVendor(
    id: string, 
    updateData: Partial<IVendorCreate>,
    userRole: string,
    userId: Types.ObjectId,
    userEmail: string,
    req?: any
  ): Promise<IVendorCreate | null> {
    try {
      // Get current state before update
      const currentVendor = await VendorCreate.findById(id);
      if (!currentVendor) {
        throw new Error('Vendor not found');
      }

      // If user is not Super Admin, prevent changing verification_status
      if (userRole !== 'super_admin' && 'verification_status' in updateData) {
        throw new Error('Only Super Admin can modify verification status');
      }

      // Validate update data
      if (updateData.vendor_email) {
        const existingVendor = await VendorCreate.findOne({
          vendor_email: updateData.vendor_email.toLowerCase(),
          _id: { $ne: id }
        });

        if (existingVendor) {
          throw new Error('Vendor with this email already exists');
        }
      }

      if (updateData.vendor_id) {
        const existingVendor = await VendorCreate.findOne({
          vendor_id: updateData.vendor_id,
          _id: { $ne: id }
        });

        if (existingVendor) {
          throw new Error('Vendor with this ID already exists');
        }
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('verified_by', 'name email');

      if (updatedVendor) {
        // Create audit trail record
        await this.createVendorAuditRecord(
          userId,
          userEmail,
          userRole,
          'update',
          `Updated vendor: ${updatedVendor.vendor_name}`,
          updatedVendor._id as Types.ObjectId,
          updatedVendor.vendor_name,
          updatedVendor.vendor_id,
          currentVendor.toObject(),
          updatedVendor.toObject(),
          req
        );
      }

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error updating vendor: ${error.message}`);
    }
  }

  // Enhanced Vendor Verification with Audit Trail
  async updateVendorVerification(
    vendorId: string, 
    verificationStatus: 'verified' | 'rejected' | 'pending',
    verifiedBy: Types.ObjectId,
    userRole: string,
    userEmail: string,
    notes?: string,
    req?: any
  ): Promise<IVendorCreate> {
    try {
      // Check if user is Super Admin
      if (userRole !== 'super_admin') {
        throw new Error('Only Super Admin can modify vendor verification status');
      }

      // Get current state before update
      const currentVendor = await VendorCreate.findById(vendorId);
      if (!currentVendor) {
        throw new Error('Vendor not found');
      }

      const updateData: any = {
        verification_status: verificationStatus,
        verified_by: verifiedBy,
        updatedAt: new Date()
      };

      // Add notes if provided
      if (notes) {
        updateData.risk_notes = `${verificationStatus.toUpperCase()} - ${notes} (${new Date().toISOString()})`;
      } else {
        updateData.risk_notes = `Status changed to ${verificationStatus} by super admin on ${new Date().toISOString()}`;
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(
        vendorId,
        updateData,
        { new: true, runValidators: true }
      ).populate('verified_by', 'name email')
       .populate('createdBy', 'name email');

      if (!updatedVendor) {
        throw new Error('Vendor not found');
      }

      // Create audit trail record
      await this.createVendorAuditRecord(
        verifiedBy,
        userEmail,
        userRole,
        'status_change',
        `Changed vendor status to ${verificationStatus}: ${notes || 'No additional notes'}`,
        updatedVendor._id as Types.ObjectId,
        updatedVendor.vendor_name,
        updatedVendor.vendor_id,
        currentVendor.toObject(),
        updatedVendor.toObject(),
        req
      );

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error updating vendor verification: ${error.message}`);
    }
  }

  // Enhanced Delete Vendor with Audit Trail
  async deleteVendor(
    id: string,
    userId: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<boolean> {
    try {
      // Get vendor details before deletion
      const vendorToDelete = await VendorCreate.findById(id);
      if (!vendorToDelete) {
        throw new Error('Vendor not found');
      }

      const result = await VendorCreate.findByIdAndDelete(id);
      
      if (result) {
        // Create audit trail record
        await this.createVendorAuditRecord(
          userId,
          userEmail,
          userRole,
          'delete',
          `Deleted vendor: ${vendorToDelete.vendor_name}`,
          vendorToDelete._id as Types.ObjectId,
          vendorToDelete.vendor_name,
          vendorToDelete.vendor_id,
          vendorToDelete.toObject(),
          undefined,
          req
        );
      }

      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting vendor: ${error.message}`);
    }
  }

  // Generate unique vendor ID
  private generateVendorId(): string {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `VEND-${timestamp}-${random}`;
  }

  // Get Super Admin Dashboard Data - Show ALL vendors
  async getSuperAdminDashboard(filters: {
    verification_status?: string;
    risk_rating?: string;
    vendor_category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    total_vendors: number;
    pending_approvals: number;
    active_vendors: number;
    rejected_vendors: number;
    vendors: any[];
  }> {
    try {
      // Get counts with proper filtering
      const [totalVendors, pendingApprovals, activeVendors, rejectedVendors] = await Promise.all([
        VendorCreate.countDocuments(),
        VendorCreate.countDocuments({ verification_status: 'pending' }),
        VendorCreate.countDocuments({ verification_status: 'verified' }),
        VendorCreate.countDocuments({ verification_status: 'rejected' })
      ]);

      // Build query for vendors
      const query: any = {};

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: 'i' } },
          { vendor_email: { $regex: filters.search, $options: 'i' } },
          { vendor_id: { $regex: filters.search, $options: 'i' } },
          { primary_contact_name: { $regex: filters.search, $options: 'i' } },
          { vendor_category: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      // Get ALL vendors for the dashboard table with creator information
      const vendors = await VendorCreate.find(query)
        .populate('createdBy', 'name email')
        .populate('verified_by', 'name email')
        .select('vendor_name vendor_category vendor_id risk_rating contract_expiry_date verification_status createdBy verified_by createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const dashboardVendors = vendors.map(vendor => ({
        _id: vendor._id,
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        vendor_category: vendor.vendor_category,
        verification_status: vendor.verification_status,
        risk_rating: vendor.risk_rating,
        contract_expiry_date: vendor.contract_expiry_date,
        created_by: vendor.createdBy,
        verified_by: vendor.verified_by,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt,
        // Actions based on current status
        actions: this.getAvailableActions(vendor.verification_status)
      }));

      return {
        total_vendors: totalVendors,
        pending_approvals: pendingApprovals,
        active_vendors: activeVendors,
        rejected_vendors: rejectedVendors,
        vendors: dashboardVendors
      };

    } catch (error: any) {
      throw new Error(`Error getting super admin dashboard: ${error.message}`);
    }
  }

  // Helper method to determine available actions based on vendor status
  private getAvailableActions(verificationStatus: string): string[] {
    switch (verificationStatus) {
      case 'pending':
        return ['verify', 'reject', 'view', 'edit'];
      case 'verified':
        return ['reject', 'view', 'edit'];
      case 'rejected':
        return ['verify', 'view', 'edit'];
      default:
        return ['view', 'edit'];
    }
  }

  // Toggle Vendor Verification Status (Verify ↔ Reject)
  async toggleVendorVerification(
    vendorId: string, 
    verifiedBy: Types.ObjectId,
    userRole: string
  ): Promise<IVendorCreate> {
    try {
      // Check if user is Super Admin
      if (userRole !== 'super_admin') {
        throw new Error('Only Super Admin can verify or reject vendors');
      }

      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      let newStatus: 'verified' | 'rejected';
      let updateData: any = {
        verified_by: verifiedBy,
        updatedAt: new Date()
      };

      // Toggle between verified and rejected
      if (vendor.verification_status === 'verified') {
        newStatus = 'rejected';
        updateData.verification_status = newStatus;
        updateData.risk_notes = `Vendor rejected by super admin on ${new Date().toISOString()}`;
      } else if (vendor.verification_status === 'rejected') {
        newStatus = 'verified';
        updateData.verification_status = newStatus;
        updateData.risk_notes = `Vendor verified by super admin on ${new Date().toISOString()}`;
      } else {
        // If pending, default to verify
        newStatus = 'verified';
        updateData.verification_status = newStatus;
        updateData.risk_notes = `Vendor verified by super admin on ${new Date().toISOString()}`;
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(
        vendorId,
        updateData,
        { new: true, runValidators: true }
      ).populate('verified_by', 'name email')
       .populate('createdBy', 'name email');

      if (!updatedVendor) {
        throw new Error('Vendor not found');
      }

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error toggling vendor verification: ${error.message}`);
    }
  }

  // Get All Vendors for Super Admin with advanced filtering
  async getAllVendorsForSuperAdmin(filters: {
    verification_status?: string;
    risk_rating?: string;
    vendor_category?: string;
    created_by?: string;
    search?: string;
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<{ vendors: any[]; total: number; page: number; pages: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.created_by) {
        query.createdBy = new Types.ObjectId(filters.created_by);
      }

      if (filters.date_from || filters.date_to) {
        query.createdAt = {};
        if (filters.date_from) {
          query.createdAt.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          query.createdAt.$lte = new Date(filters.date_to);
        }
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: 'i' } },
          { vendor_email: { $regex: filters.search, $options: 'i' } },
          { vendor_id: { $regex: filters.search, $options: 'i' } },
          { primary_contact_name: { $regex: filters.search, $options: 'i' } },
          { vendor_category: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [vendors, total] = await Promise.all([
        VendorCreate.find(query)
          .populate('createdBy', 'name email')
          .populate('verified_by', 'name email')
          .select('vendor_name vendor_category vendor_email vendor_id risk_rating verification_status contract_expiry_date createdBy verified_by createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        VendorCreate.countDocuments(query)
      ]);

      const formattedVendors = vendors.map(vendor => ({
        _id: vendor._id,
        vendor_name: vendor.vendor_name,
        vendor_category: vendor.vendor_category,
        vendor_email: vendor.vendor_email,
        vendor_id: vendor.vendor_id,
        risk_rating: vendor.risk_rating,
        verification_status: vendor.verification_status,
        contract_expiry_date: vendor.contract_expiry_date,
        created_by: vendor.createdBy,
        verified_by: vendor.verified_by,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt,
        actions: this.getAvailableActions(vendor.verification_status)
      }));

      return {
        vendors: formattedVendors,
        total,
        page,
        pages: Math.ceil(total / limit)
      };

    } catch (error: any) {
      throw new Error(`Error fetching vendors for super admin: ${error.message}`);
    }
  }

  // Bulk Verify/Reject Vendors
  async bulkUpdateVendorVerification(
    vendorIds: string[],
    verificationStatus: 'verified' | 'rejected',
    verifiedBy: Types.ObjectId,
    userRole: string,
    rejectionReason?: string
  ): Promise<{ successful: string[]; failed: any[] }> {
    try {
      // Check if user is Super Admin
      if (userRole !== 'super_admin') {
        throw new Error('Only Super Admin can verify or reject vendors');
      }

      const successful: string[] = [];
      const failed: any[] = [];

      for (const vendorId of vendorIds) {
        try {
          const updateData: any = {
            verification_status: verificationStatus,
            verified_by: verifiedBy,
            updatedAt: new Date()
          };

          if (verificationStatus === 'rejected' && rejectionReason) {
            updateData.risk_notes = rejectionReason;
          }

          const updatedVendor = await VendorCreate.findByIdAndUpdate(
            vendorId,
            updateData,
            { new: true, runValidators: true }
          );

          if (updatedVendor) {
            successful.push(vendorId);
          } else {
            failed.push({ vendorId, error: 'Vendor not found' });
          }
        } catch (error: any) {
          failed.push({ vendorId, error: error.message });
        }
      }

      return { successful, failed };
    } catch (error: any) {
      throw new Error(`Error bulk updating vendor verification: ${error.message}`);
    }
  }

  // Get Vendor Statistics for Super Admin
  async getVendorStatistics(): Promise<{
    total_vendors: number;
    pending_approvals: number;
    active_vendors: number;
    rejected_vendors: number;
    vendors_by_category: any[];
    vendors_by_risk: any[];
    recent_activity: any[];
  }> {
    try {
      const [totalVendors, pendingApprovals, activeVendors, rejectedVendors] = await Promise.all([
        VendorCreate.countDocuments(),
        VendorCreate.countDocuments({ verification_status: 'pending' }),
        VendorCreate.countDocuments({ verification_status: 'verified' }),
        VendorCreate.countDocuments({ verification_status: 'rejected' })
      ]);

      const vendorsByCategory = await VendorCreate.aggregate([
        {
          $group: {
            _id: '$vendor_category',
            count: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$verification_status', 'pending'] }, 1, 0] }
            },
            verified: {
              $sum: { $cond: [{ $eq: ['$verification_status', 'verified'] }, 1, 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$verification_status', 'rejected'] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const vendorsByRisk = await VendorCreate.aggregate([
        {
          $group: {
            _id: '$risk_rating',
            count: { $sum: 1 }
          }
        }
      ]);

      const recentActivity = await VendorCreate.find()
        .populate('createdBy', 'name email')
        .populate('verified_by', 'name email')
        .select('vendor_name verification_status createdBy verified_by createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return {
        total_vendors: totalVendors,
        pending_approvals: pendingApprovals,
        active_vendors: activeVendors,
        rejected_vendors: rejectedVendors,
        vendors_by_category: vendorsByCategory,
        vendors_by_risk: vendorsByRisk,
        recent_activity: recentActivity
      };
    } catch (error: any) {
      throw new Error(`Error getting vendor statistics: ${error.message}`);
    }
  }

  // Get Pending Approvals with detailed information
  async getPendingApprovals(): Promise<any[]> {
    try {
      return await VendorCreate.find({ verification_status: 'pending' })
        .populate('createdBy', 'name email')
        .select('vendor_name vendor_category vendor_email vendor_id risk_rating contract_expiry_date createdBy createdAt')
        .sort({ createdAt: -1 })
        .lean();
    } catch (error: any) {
      throw new Error(`Error fetching pending approvals: ${error.message}`);
    }
  }

  // Get Vendor by ID
  async getVendorById(id: string): Promise<IVendorCreate | null> {
    try {
      return await VendorCreate.findById(id)
        .populate('createdBy', 'name email')
        .populate('verified_by', 'name email');
    } catch (error: any) {
      throw new Error(`Error fetching vendor: ${error.message}`);
    }
  }

  // Get Vendor by Vendor ID
  async getVendorByVendorId(vendorId: string): Promise<IVendorCreate | null> {
    try {
      return await VendorCreate.findOne({ vendor_id: vendorId })
        .populate('createdBy', 'name email')
        .populate('verified_by', 'name email');
    } catch (error: any) {
      throw new Error(`Error fetching vendor: ${error.message}`);
    }
  }

  // Get All Vendors with filtering and pagination (for general use)
  async getAllVendors(filters: {
    verification_status?: string;
    risk_rating?: string;
    vendor_category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ vendors: IVendorCreate[]; total: number; page: number; pages: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: 'i' } },
          { vendor_email: { $regex: filters.search, $options: 'i' } },
          { vendor_id: { $regex: filters.search, $options: 'i' } },
          { primary_contact_name: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [vendors, total] = await Promise.all([
        VendorCreate.find(query)
          .populate('createdBy', 'name email')
          .populate('verified_by', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        VendorCreate.countDocuments(query)
      ]);

      return {
        vendors,
        total,
        page,
        pages: Math.ceil(total / limit)
      };

    } catch (error: any) {
      throw new Error(`Error fetching vendors: ${error.message}`);
    }
  }

  // Bulk Create Vendors
async createBulkVendors(
  vendorsData: Partial<IVendorCreate>[],
  createdBy: Types.ObjectId
): Promise<{ 
  successful: any[]; 
  failed: any[]; 
}> {
  const successful: any[] = [];
  const failed: any[] = [];

  for (let i = 0; i < vendorsData.length; i++) {
    try {
      // ===== IMPORTANT: Validate company_registration_number for each vendor =====
      if (vendorsData[i].company_registration_number) {
        const companyExists = await CompanyCreate.findOne({
          company_registration_number: vendorsData[i].company_registration_number
        });

        if (!companyExists) {
          throw new Error(`Company with registration number "${vendorsData[i].company_registration_number}" does not exist`);
        }
      } else {
        throw new Error('Company registration number is required');
      }
      // ===== END VALIDATION =====

      const result = await this.createCompleteVendor(
        vendorsData[i], 
        createdBy, 
        '', 
        'vendor_admin'
      );
      successful.push({
        index: i,
        vendor_name: result.vendor_name,
        vendor_id: result.vendor_id,
        company_registration_number: result.company_registration_number,
        data: result
      });
    } catch (error: any) {
      failed.push({
        index: i,
        vendor_name: vendorsData[i].vendor_name,
        company_registration_number: vendorsData[i].company_registration_number,
        error: error.message
      });
    }
  }

  return { successful, failed };
}
// In VendorService.ts, add these methods:

/**
 * Get all vendors for a specific company
 */
public static async getVendorsByCompanyService(companyRegistrationNumber: string, query: {
  page?: number;
  limit?: number;
  search?: string;
  verification_status?: string;
  risk_rating?: string;
  vendor_category?: string;
} = {}) {
  
  // First, verify company exists
  const company = await CompanyCreate.findOne({ 
    company_registration_number: companyRegistrationNumber 
  });
  
  if (!company) {
    throw new Error('Company not found');
  }

  const {
    page = 1,
    limit = 10,
    search,
    verification_status,
    risk_rating,
    vendor_category
  } = query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  let filter: any = {
    company_registration_number: companyRegistrationNumber
  };

  // Add optional filters
  if (verification_status) {
    filter.verification_status = verification_status;
  }

  if (risk_rating) {
    filter.risk_rating = risk_rating;
  }

  if (vendor_category) {
    filter.vendor_category = vendor_category;
  }

  if (search) {
    filter.$or = [
      { vendor_name: { $regex: search, $options: 'i' } },
      { vendor_email: { $regex: search, $options: 'i' } },
      { vendor_id: { $regex: search, $options: 'i' } },
      { primary_contact_name: { $regex: search, $options: 'i' } },
      { vendor_category: { $regex: search, $options: 'i' } }
    ];
  }

  const [vendors, totalCount] = await Promise.all([
    VendorCreate.find(filter)
      .populate('createdBy', 'name email')
      .populate('verified_by', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),

    VendorCreate.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    company: {
      _id: company._id,
      registered_company_name: company.registered_company_name,
      company_registration_number: company.company_registration_number,
      office_email: company.office_email
    },
    vendors: vendors,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
      limit: limitNum
    }
  };
}

/**
 * Get company with vendor statistics
 */
public static async getCompanyWithVendorStatsService(companyId: string) {
  // Get company details
  const company = await CompanyCreate.findById(companyId).select('-__v');
  
  if (!company) {
    throw new Error('Company not found');
  }

  // Get vendor statistics for this company
  const vendorStats = await VendorCreate.aggregate([
    {
      $match: {
        company_registration_number: company.company_registration_number
      }
    },
    {
      $group: {
        _id: '$verification_status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get vendors by category
  const vendorsByCategory = await VendorCreate.aggregate([
    {
      $match: {
        company_registration_number: company.company_registration_number
      }
    },
    {
      $group: {
        _id: '$vendor_category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Get vendors by risk rating
  const vendorsByRisk = await VendorCreate.aggregate([
    {
      $match: {
        company_registration_number: company.company_registration_number
      }
    },
    {
      $group: {
        _id: '$risk_rating',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get recent vendors (last 5)
  const recentVendors = await VendorCreate.find({
    company_registration_number: company.company_registration_number
  })
  .populate('createdBy', 'name email')
  .select('vendor_name vendor_id vendor_category verification_status risk_rating createdAt')
  .sort({ createdAt: -1 })
  .limit(5);

  // Calculate total vendors
  const totalVendors = await VendorCreate.countDocuments({
    company_registration_number: company.company_registration_number
  });

  // Transform vendor stats
  const statsObject = {
    pending: 0,
    verified: 0,
    failed: 0,
    rejected: 0
  };

  vendorStats.forEach(stat => {
    statsObject[stat._id] = stat.count;
  });

  return {
    company: company,
    statistics: {
      total_vendors: totalVendors,
      by_status: statsObject,
      by_category: vendorsByCategory,
      by_risk: vendorsByRisk
    },
    recent_vendors: recentVendors
  };
}
  // Get Vendor Admin Dashboard Data
  async getVendorAdminDashboard(
    createdBy: Types.ObjectId,
    filters: {
      verification_status?: string;
      risk_rating?: string;
      vendor_category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    total_vendors: number;
    pending_approvals: number;
    active_vendors: number;
    rejected_vendors: number;
    vendors: any[];
  }> {
    try {
      // Build query for vendor admin (only their own vendors)
      const baseQuery: any = { createdBy };

      // Get counts with vendor admin filtering
      const [totalVendors, pendingApprovals, activeVendors, rejectedVendors] = await Promise.all([
        VendorCreate.countDocuments(baseQuery),
        VendorCreate.countDocuments({ ...baseQuery, verification_status: 'pending' }),
        VendorCreate.countDocuments({ ...baseQuery, verification_status: 'verified' }),
        VendorCreate.countDocuments({ ...baseQuery, verification_status: 'rejected' })
      ]);

      // Build complete query with filters
      const query: any = { createdBy };

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: 'i' } },
          { vendor_email: { $regex: filters.search, $options: 'i' } },
          { vendor_id: { $regex: filters.search, $options: 'i' } },
          { vendor_category: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      // Get vendors for the dashboard table (only vendor admin's vendors)
      const vendors = await VendorCreate.find(query)
        .populate('createdBy', 'name email')
        .populate('verified_by', 'name email')
        .select('vendor_name vendor_category vendor_id risk_rating contract_expiry_date verification_status createdBy verified_by createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const dashboardVendors = vendors.map(vendor => ({
        _id: vendor._id,
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        vendor_category: vendor.vendor_category,
        verification_status: vendor.verification_status,
        risk_rating: vendor.risk_rating,
        contract_expiry_date: vendor.contract_expiry_date,
        created_by: vendor.createdBy,
        verified_by: vendor.verified_by,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt,
        // Actions for vendor admin
        actions: this.getVendorAdminActions(vendor.verification_status)
      }));

      return {
        total_vendors: totalVendors,
        pending_approvals: pendingApprovals,
        active_vendors: activeVendors,
        rejected_vendors: rejectedVendors,
        vendors: dashboardVendors
      };

    } catch (error: any) {
      throw new Error(`Error getting vendor admin dashboard: ${error.message}`);
    }
  }

  // Helper method to determine available actions for vendor admin
  private getVendorAdminActions(verificationStatus: string): string[] {
    // Vendor admin can always view, edit, and delete their vendors
    // But cannot change verification status (only super admin can do that)
    return ['view', 'edit', 'delete'];
  }

  // Update Vendor for Vendor Admin (with restrictions)
  async updateVendorForAdmin(
    id: string, 
    updateData: Partial<IVendorCreate>,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IVendorCreate | null> {
    try {
      // Check if vendor exists and belongs to the user
      const existingVendor = await VendorCreate.findById(id);
      if (!existingVendor) {
        throw new Error('Vendor not found');
      }

      // Vendor admin can only update their own vendors
      if (userRole === 'vendor_admin' && !existingVendor.createdBy.equals(userId)) {
        throw new Error('You can only update vendors created by you');
      }

      // Vendor admin cannot change verification_status
      if (userRole === 'vendor_admin' && 'verification_status' in updateData) {
        throw new Error('Only Super Admin can modify verification status');
      }

      // Define allowed fields for vendor admin to update
      const allowedFields = [
        'vendor_name',
        'vendor_billing_name',
        'primary_contact_name',
        'vendor_category',
        'vendor_address',
        'vendor_contact',
        'vendor_email',
        'vendor_phone',
        'bank_account_number',
        'ifsc_code',
        'payment_terms',
        'gst_number',
        'pan_number',
        'tds_rate',
        'billing_cycle',
        'risk_rating',
        'risk_notes',
        'payment_methods',
        'internal_notes',
        'contract_expiry_date',
        'contract_renewal_date',
        'document_names',
        'documents_uploaded'
      ];

      // Filter update data to only include allowed fields
      const filteredUpdateData: Record<string, any> = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key as keyof IVendorCreate];
        }
      });

      // Validate email uniqueness if being updated
      if (filteredUpdateData.vendor_email) {
        const existingVendorWithEmail = await VendorCreate.findOne({
          vendor_email: filteredUpdateData.vendor_email.toLowerCase(),
          _id: { $ne: id }
        });

        if (existingVendorWithEmail) {
          throw new Error('Vendor with this email already exists');
        }
      }

      return await VendorCreate.findByIdAndUpdate(
        id,
        filteredUpdateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('verified_by', 'name email');

    } catch (error: any) {
      throw new Error(`Error updating vendor: ${error.message}`);
    }
  }

  // Get Vendor Details for Edit (with proper authorization)
  async getVendorForEdit(
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IVendorCreate | null> {
    try {
      const vendor = await VendorCreate.findById(id)
        .populate('createdBy', 'name email')
        .populate('verified_by', 'name email');

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Vendor admin can only access their own vendors
      if (userRole === 'vendor_admin' && !vendor.createdBy.equals(userId)) {
        throw new Error('You can only access vendors created by you');
      }

      return vendor;
    } catch (error: any) {
      throw new Error(`Error fetching vendor: ${error.message}`);
    }
  }

  // Delete Vendor with authorization check
  async deleteVendorForAdmin(
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<boolean> {
    try {
      const vendor = await VendorCreate.findById(id);
      
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Vendor admin can only delete their own vendors
      if (userRole === 'vendor_admin' && !vendor.createdBy.equals(userId)) {
        throw new Error('You can only delete vendors created by you');
      }

      const result = await VendorCreate.findByIdAndDelete(id);
      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting vendor: ${error.message}`);
    }
  }

  // Helper method to get changed fields between two objects
  private getChangedFields(before: any, after: any): string[] {
    const changedFields: string[] = [];
    
    if (!before || !after) return changedFields;
    
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    });
    
    return changedFields;
  }

  // Helper method to create audit record
  private async createVendorAuditRecord(
    user: Types.ObjectId,
    user_email: string,
    user_role: string,
    action: string,
    action_description: string,
    target_vendor: Types.ObjectId,
    target_vendor_name: string,
    target_vendor_id: string,
    before_state?: any,
    after_state?: any,
    req?: any
  ) {
    try {
      await this.auditTrailService.createAuditRecord({
        user,
        user_email,
        user_role,
        action,
        action_description,
        target_vendor,
        target_vendor_name,
        target_vendor_id,
        before_state,
        after_state,
        changed_fields: before_state && after_state ? this.getChangedFields(before_state, after_state) : [],
        ip_address: req?.ip || req?.connection?.remoteAddress,
        user_agent: req?.get('User-Agent')
      });
    } catch (error) {
      console.error('Failed to create audit record:', error);
      // Don't throw error - audit failure shouldn't break main functionality
    }
  }

  // ==================== DOCUMENT MANAGEMENT METHODS ====================

  /**
   * Upload document to vendor
   * @param vendorId - Vendor MongoDB ID
   * @param file - Multer file object
   * @param documentType - Type of document
   * @param expiryDate - Optional expiry date
   * @param userId - User performing the action
   * @param userEmail - User email
   * @param userRole - User role
   * @param req - Request object for audit
   * @returns Updated vendor document
   */
  async uploadVendorDocument(
    vendorId: string,
    file: Express.Multer.File,
    documentType: IVendorDocument['document_type'],
    expiryDate: Date | undefined,
    userId: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<IVendorCreate | null> {
    try {
      // Find vendor
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Validate document type
      if (!this.documentUploadService.validateDocumentType(documentType)) {
        throw new Error('Invalid document type');
      }

      // Upload to Cloudinary
      const { url, publicId } = await this.documentUploadService.uploadToCloudinary(
        file.buffer,
        file.originalname,
        `frovo/vendors/${vendor.vendor_id}`
      );

      // Create document metadata
      const documentMetadata = this.documentUploadService.createDocumentMetadata(
        file,
        documentType,
        url,
        publicId,
        expiryDate
      );

      // Add document to vendor
      const beforeState = vendor.toObject();
      vendor.documents.push(documentMetadata as any);
      await vendor.save();

      // Create audit trail
      await this.createVendorAuditRecord(
        userId,
        userEmail,
        userRole,
        'document_upload',
        `Uploaded document: ${file.originalname} (${documentType})`,
        vendor._id as Types.ObjectId,
        vendor.vendor_name,
        vendor.vendor_id,
        beforeState,
        vendor.toObject(),
        req
      );

      return vendor;
    } catch (error: any) {
      throw new Error(`Error uploading vendor document: ${error.message}`);
    }
  }

  /**
   * Delete vendor document
   * @param vendorId - Vendor MongoDB ID
   * @param documentId - Document MongoDB ID
   * @param userId - User performing the action
   * @param userEmail - User email
   * @param userRole - User role
   * @param req - Request object for audit
   * @returns Updated vendor document
   */
  async deleteVendorDocument(
    vendorId: string,
    documentId: string,
    userId: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<IVendorCreate | null> {
    try {
      // Find vendor
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Find document by _id
      const documentIndex = vendor.documents.findIndex(
        (doc: any) => doc._id.toString() === documentId
      );

      if (documentIndex === -1) {
        throw new Error('Document not found');
      }

      const document = vendor.documents[documentIndex];

      // Delete from Cloudinary
      await this.documentUploadService.deleteFromCloudinary(document.cloudinary_public_id);

      // Remove document from vendor
      const beforeState = vendor.toObject();
      const documentName = document.document_name;
      const documentType = document.document_type;

      vendor.documents.splice(documentIndex, 1);
      await vendor.save();

      // Create audit trail
      await this.createVendorAuditRecord(
        userId,
        userEmail,
        userRole,
        'document_delete',
        `Deleted document: ${documentName} (${documentType})`,
        vendor._id as Types.ObjectId,
        vendor.vendor_name,
        vendor.vendor_id,
        beforeState,
        vendor.toObject(),
        req
      );

      return vendor;
    } catch (error: any) {
      throw new Error(`Error deleting vendor document: ${error.message}`);
    }
  }

  /**
   * Get vendor documents
   * @param vendorId - Vendor MongoDB ID
   * @returns Array of vendor documents
   */
  async getVendorDocuments(vendorId: string): Promise<IVendorDocument[]> {
    try {
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      return vendor.documents;
    } catch (error: any) {
      throw new Error(`Error fetching vendor documents: ${error.message}`);
    }
  }

  /**
   * Get single vendor document
   * @param vendorId - Vendor MongoDB ID
   * @param documentId - Document MongoDB ID
   * @returns Single vendor document
   */
  async getVendorDocument(vendorId: string, documentId: string): Promise<IVendorDocument | null> {
    try {
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Find document by _id
      const document = vendor.documents.find(
        (doc: any) => doc._id.toString() === documentId
      );

      if (!document) {
        return null;
      }

      return document;
    } catch (error: any) {
      throw new Error(`Error fetching vendor document: ${error.message}`);
    }
  }
}

// Validation Service
class VendorValidationService {
  static validateCompleteVendorData(data: Partial<IVendorCreate>): void {
    // Basic Information Validation
    if (!data.vendor_name) {
      throw new Error('Vendor name is required');
    }

    if (!data.vendor_billing_name) {
      throw new Error('Vendor billing name is required');
    }

    if (!data.primary_contact_name) {
      throw new Error('Primary contact name is required');
    }

    if (!data.vendor_category) {
      throw new Error('Vendor category is required');
    }

    if (!data.vendor_address) {
      throw new Error('Vendor address is required');
    }

    if (!data.contact_phone) {
      throw new Error('Contact phone is required');
    }

    if (!data.vendor_email) {
      throw new Error('Vendor email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.vendor_email)) {
      throw new Error('Invalid vendor email format');
    }

    if (!data.vendor_type || data.vendor_type.length === 0) {
      throw new Error('At least one vendor type is required');
    }

    // Financial Information Validation
    if (!data.bank_account_number) {
      throw new Error('Bank account number is required');
    }

    if (!data.ifsc_code) {
      throw new Error('IFSC code is required');
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(data.ifsc_code)) {
      throw new Error('Valid IFSC code is required (format: ABCD0123456)');
    }

    // Compliance Information Validation
    if (!data.gst_number) {
      throw new Error('GST number is required');
    }

    if (!data.pan_number) {
      throw new Error('PAN number is required');
    }

    if (data.tds_rate === undefined || data.tds_rate === null) {
      throw new Error('TDS rate is required');
    }

    if (data.tds_rate < 0 || data.tds_rate > 100) {
      throw new Error('TDS rate must be between 0 and 100');
    }

    // Contract Information Validation
    if (!data.contract_expiry_date) {
      throw new Error('Contract expiry date is required');
    }

    if (!data.contract_renewal_date) {
      throw new Error('Contract renewal date is required');
    }

    if (data.contract_expiry_date && data.contract_renewal_date) {
      const expiryDate = new Date(data.contract_expiry_date);
      const renewalDate = new Date(data.contract_renewal_date);
      
      if (expiryDate <= renewalDate) {
        throw new Error('Contract expiry date must be after renewal date');
      }
    }

    // Risk Information Validation
    if (!data.risk_notes) {
      throw new Error('Risk notes are required');
    }
  }
}