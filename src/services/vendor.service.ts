import { VendorCreate, IVendorCreate, VendorDashboard, IVendorDashboard } from '../models/Vendor.model';
import { Types } from 'mongoose';

export class VendorService {
  
  // Create Complete Vendor in single collection
  async createCompleteVendor(
    vendorData: Partial<IVendorCreate>,
    createdBy: Types.ObjectId
  ): Promise<IVendorCreate> {
    try {
      // Validate vendor data
      VendorValidationService.validateCompleteVendorData(vendorData);

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
        verification_status: 'pending', // Always start as pending
        verified_by: undefined // Clear verified_by for new vendors
      };

      const vendor = new VendorCreate(completeVendorData);
      return await vendor.save();

    } catch (error: any) {
      throw new Error(`Error creating vendor: ${error.message}`);
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
        return ['reject', 'view', 'edit']; // Can still reject a verified vendor
      case 'rejected':
        return ['verify', 'view', 'edit']; // Can verify a rejected vendor
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

  // Update Vendor Verification with flexible status changes
  async updateVendorVerification(
    vendorId: string, 
    verificationStatus: 'verified' | 'rejected' | 'pending',
    verifiedBy: Types.ObjectId,
    userRole: string,
    notes?: string
  ): Promise<IVendorCreate> {
    try {
      // Check if user is Super Admin
      if (userRole !== 'super_admin') {
        throw new Error('Only Super Admin can modify vendor verification status');
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

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error updating vendor verification: ${error.message}`);
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

  // Update Vendor
  async updateVendor(
    id: string, 
    updateData: Partial<IVendorCreate>,
    userRole: string
  ): Promise<IVendorCreate | null> {
    try {
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

      return await VendorCreate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('verified_by', 'name email');

    } catch (error: any) {
      throw new Error(`Error updating vendor: ${error.message}`);
    }
  }

  // Delete Vendor
  async deleteVendor(id: string): Promise<boolean> {
    try {
      const result = await VendorCreate.findByIdAndDelete(id);
      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting vendor: ${error.message}`);
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
        const result = await this.createCompleteVendor(vendorsData[i], createdBy);
        successful.push({
          index: i,
          vendor_name: result.vendor_name,
          vendor_id: result.vendor_id,
          data: result
        });
      } catch (error: any) {
        failed.push({
          index: i,
          vendor_name: vendorsData[i].vendor_name,
          error: error.message
        });
      }
    }

    return { successful, failed };
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

    if (!data.vendor_contact) {
      throw new Error('Vendor contact is required');
    }

    if (!data.vendor_email) {
      throw new Error('Vendor email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.vendor_email)) {
      throw new Error('Invalid vendor email format');
    }

    if (!data.vendor_phone) {
      throw new Error('Vendor phone is required');
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