// services/vendor.service.ts
import {
  VendorDetails,
  IVendorDetails,
  VendorFinancials,
  IVendorFinancials,
  VendorCompliance,
  IVendorCompliance,
  VendorStatus,
  IVendorStatus,
  VendorDocument,
  IVendorDocument,
  VendorContract,
  IVendorContract,
  VendorSystemInfo,
  IVendorSystemInfo,
  VendorDashboard,
  IVendorDashboard
} from '../models/Vendor.model';
import { Types } from 'mongoose';

export class VendorService {
  
  // Step 1: Create Vendor Details
  async createVendorDetails(
    vendorDetailsData: Partial<IVendorDetails>,
    createdBy: Types.ObjectId
  ): Promise<IVendorDetails> {
    try {
      const vendorDetails = new VendorDetails({
        ...vendorDetailsData,
        createdBy
      });
      return await vendorDetails.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor details: ${error.message}`);
    }
  }

  // Step 2: Create Vendor Financials
  async createVendorFinancials(
    financialsData: Partial<IVendorFinancials>,
    createdBy: Types.ObjectId
  ): Promise<IVendorFinancials> {
    try {
      // Validate that vendor field is provided
      if (!financialsData.vendor) {
        throw new Error('Vendor ID is required. Please provide a valid vendor ID.');
      }

      // Check if vendor exists
      const vendorExists = await VendorDetails.findById(financialsData.vendor);
      if (!vendorExists) {
        throw new Error('Vendor not found. Please provide a valid vendor ID.');
      }

      // Check if financials already exist for this vendor
      const existingFinancials = await VendorFinancials.findOne({ 
        vendor: financialsData.vendor 
      });
      
      if (existingFinancials) {
        throw new Error('Financials already exist for this vendor. Use update instead.');
      }

      const vendorFinancials = new VendorFinancials({
        ...financialsData,
        createdBy
      });

      return await vendorFinancials.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor financials: ${error.message}`);
    }
  }

  // Step 3: Create Vendor Compliance
  async createVendorCompliance(
    complianceData: Partial<IVendorCompliance>,
    createdBy: Types.ObjectId
  ): Promise<IVendorCompliance> {
    try {
      // Validate that vendor field is provided
      if (!complianceData.vendor) {
        throw new Error('Vendor ID is required. Please provide a valid vendor ID.');
      }

      // Check if vendor exists
      const vendorExists = await VendorDetails.findById(complianceData.vendor);
      if (!vendorExists) {
        throw new Error('Vendor not found. Please provide a valid vendor ID.');
      }

      // Check if compliance already exists for this vendor
      const existingCompliance = await VendorCompliance.findOne({ 
        vendor: complianceData.vendor 
      });
      
      if (existingCompliance) {
        throw new Error('Compliance already exists for this vendor. Use update instead.');
      }

      const vendorCompliance = new VendorCompliance({
        ...complianceData,
        createdBy
      });
      return await vendorCompliance.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor compliance: ${error.message}`);
    }
  }

  // Step 4: Create Vendor Status
  async createVendorStatus(
    statusData: Partial<IVendorStatus>,
    createdBy: Types.ObjectId
  ): Promise<IVendorStatus> {
    try {
      // Validate that vendor field is provided
      if (!statusData.vendor) {
        throw new Error('Vendor ID is required. Please provide a valid vendor ID.');
      }

      // Check if vendor exists
      const vendorExists = await VendorDetails.findById(statusData.vendor);
      if (!vendorExists) {
        throw new Error('Vendor not found. Please provide a valid vendor ID.');
      }

      // Check if status already exists for this vendor
      const existingStatus = await VendorStatus.findOne({ 
        vendor: statusData.vendor 
      });
      
      if (existingStatus) {
        throw new Error('Status already exists for this vendor. Use update instead.');
      }

      const vendorStatusData = {
        ...statusData,
        createdBy,
        verification_status: 'pending',
        verified_by: undefined
      };
      
      const vendorStatus = new VendorStatus(vendorStatusData);
      return await vendorStatus.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor status: ${error.message}`);
    }
  }

  // Step 5: Create Vendor Document
  async createVendorDocument(
    documentData: Partial<IVendorDocument>,
    createdBy: Types.ObjectId
  ): Promise<IVendorDocument> {
    try {
      // Validate that vendor field is provided
      if (!documentData.vendor) {
        throw new Error('Vendor ID is required. Please provide a valid vendor ID.');
      }

      // Check if vendor exists
      const vendorExists = await VendorDetails.findById(documentData.vendor);
      if (!vendorExists) {
        throw new Error('Vendor not found. Please provide a valid vendor ID.');
      }

      const vendorDocument = new VendorDocument({
        ...documentData,
        createdBy
      });
      return await vendorDocument.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor document: ${error.message}`);
    }
  }

  // Step 6: Create Vendor Contract
  async createVendorContract(
    contractData: Partial<IVendorContract>,
    createdBy: Types.ObjectId
  ): Promise<IVendorContract> {
    try {
      // Validate that vendor field is provided
      if (!contractData.vendor) {
        throw new Error('Vendor ID is required. Please provide a valid vendor ID.');
      }

      // Check if vendor exists
      const vendorExists = await VendorDetails.findById(contractData.vendor);
      if (!vendorExists) {
        throw new Error('Vendor not found. Please provide a valid vendor ID.');
      }

      // Check if contract already exists for this vendor
      const existingContract = await VendorContract.findOne({ 
        vendor: contractData.vendor 
      });
      
      if (existingContract) {
        throw new Error('Contract already exists for this vendor. Use update instead.');
      }

      const vendorContract = new VendorContract({
        ...contractData,
        createdBy
      });
      return await vendorContract.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor contract: ${error.message}`);
    }
  }

  // Step 7: Create Vendor System Info
  async createVendorSystemInfo(
    systemInfoData: Partial<IVendorSystemInfo>,
    createdBy: Types.ObjectId
  ): Promise<IVendorSystemInfo> {
    try {
      // Validate that vendor field is provided
      if (!systemInfoData.vendor) {
        throw new Error('Vendor ID is required. Please provide a valid vendor ID.');
      }

      // Check if vendor exists
      const vendorExists = await VendorDetails.findById(systemInfoData.vendor);
      if (!vendorExists) {
        throw new Error('Vendor not found. Please provide a valid vendor ID.');
      }

      // Check if system info already exists for this vendor
      const existingSystemInfo = await VendorSystemInfo.findOne({ 
        vendor: systemInfoData.vendor 
      });
      
      if (existingSystemInfo) {
        throw new Error('System info already exists for this vendor. Use update instead.');
      }

      const vendorSystemInfo = new VendorSystemInfo({
        ...systemInfoData,
        createdBy
      });
      return await vendorSystemInfo.save();
    } catch (error: any) {
      throw new Error(`Error creating vendor system info: ${error.message}`);
    }
  }

  // Complete Vendor Creation
  async createCompleteVendor(
    vendorData: {
      details: Partial<IVendorDetails>;
      financials: Partial<IVendorFinancials>;
      compliance: Partial<IVendorCompliance>;
      status: Partial<IVendorStatus>;
      contract?: Partial<IVendorContract>;
      systemInfo?: Partial<IVendorSystemInfo>;
    },
    createdBy: Types.ObjectId
  ): Promise<{ vendor: IVendorDetails; status: IVendorStatus }> {
    const session = await VendorDetails.startSession();
    session.startTransaction();

    try {
      // Validate vendor data first
      VendorValidationService.validateVendorDetails(vendorData.details);
      VendorValidationService.validateFinancials(vendorData.financials);
      VendorValidationService.validateCompliance(vendorData.compliance);

      // Step 1: Create Vendor Details
      const vendorDetails = await this.createVendorDetails(
        vendorData.details,
        createdBy
      );

      // Step 2: Create related records with vendor reference
      const [financials, compliance, status] = await Promise.all([
        this.createVendorFinancials({
          ...vendorData.financials,
          vendor: vendorDetails._id
        }, createdBy),
        this.createVendorCompliance({
          ...vendorData.compliance,
          vendor: vendorDetails._id
        }, createdBy),
        this.createVendorStatus({
          ...vendorData.status,
          vendor: vendorDetails._id
        }, createdBy)
      ]);

      // Optional: Create contract and system info if provided
      if (vendorData.contract) {
        await this.createVendorContract({
          ...vendorData.contract,
          vendor: vendorDetails._id
        }, createdBy);
      }

      if (vendorData.systemInfo) {
        await this.createVendorSystemInfo({
          ...vendorData.systemInfo,
          vendor: vendorDetails._id
        }, createdBy);
      }

      await session.commitTransaction();
      return { vendor: vendorDetails, status };

    } catch (error: any) {
      await session.abortTransaction();
      throw new Error(`Error creating complete vendor: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  // Get vendor details by ID
  async getVendorDetailsById(id: string): Promise<IVendorDetails | null> {
    try {
      return await VendorDetails.findById(id);
    } catch (error: any) {
      throw new Error(`Error fetching vendor details: ${error.message}`);
    }
  }

  // Get vendor financials by Vendor ID
  async getVendorFinancialsByVendorId(vendorId: string): Promise<IVendorFinancials | null> {
    try {
      return await VendorFinancials.findOne({ vendor: vendorId });
    } catch (error: any) {
      throw new Error(`Error fetching vendor financials: ${error.message}`);
    }
  }

  // Get vendor compliance by Vendor ID
  async getVendorComplianceByVendorId(vendorId: string): Promise<IVendorCompliance | null> {
    try {
      return await VendorCompliance.findOne({ vendor: vendorId });
    } catch (error: any) {
      throw new Error(`Error fetching vendor compliance: ${error.message}`);
    }
  }

  // Get vendor status by Vendor ID
  async getVendorStatusByVendorId(vendorId: string, userRole: string): Promise<IVendorStatus | null> {
    try {
      const status = await VendorStatus.findOne({ vendor: vendorId })
        .populate('vendor')
        .populate('verified_by', 'name email')
        .populate('createdBy', 'name email');

      // If user is not Super Admin, hide verified_by information for pending status
      if (status && userRole !== 'super_admin' && status.verification_status === 'pending') {
        status.verified_by = undefined as any;
      }

      return status;
    } catch (error: any) {
      throw new Error(`Error fetching vendor status: ${error.message}`);
    }
  }

  // Update vendor status by Vendor ID
  async updateVendorStatusByVendorId(
    vendorId: string, 
    statusData: Partial<IVendorStatus>,
    userRole: string
  ): Promise<IVendorStatus | null> {
    try {
      // If user is not Super Admin, prevent changing verification_status
      if (userRole !== 'super_admin' && 'verification_status' in statusData) {
        throw new Error('Only Super Admin can modify verification status');
      }

      return await VendorStatus.findOneAndUpdate(
        { vendor: vendorId },
        statusData,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor status: ${error.message}`);
    }
  }

  // Update vendor financials by Vendor ID
  async updateVendorFinancialsByVendorId(
    vendorId: string, 
    data: Partial<IVendorFinancials>
  ): Promise<IVendorFinancials | null> {
    try {
      // Remove vendor field from update data to prevent changing the vendor reference
      const { vendor, ...updateData } = data;
      
      return await VendorFinancials.findOneAndUpdate(
        { vendor: vendorId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor financials: ${error.message}`);
    }
  }

  // Update vendor compliance by Vendor ID
  async updateVendorComplianceByVendorId(
    vendorId: string, 
    data: Partial<IVendorCompliance>
  ): Promise<IVendorCompliance | null> {
    try {
      // Remove vendor field from update data to prevent changing the vendor reference
      const { vendor, ...updateData } = data;
      
      return await VendorCompliance.findOneAndUpdate(
        { vendor: vendorId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor compliance: ${error.message}`);
    }
  }

  // Get vendor documents by Vendor ID
  async getVendorDocuments(vendorId: string): Promise<IVendorDocument[]> {
    try {
      return await VendorDocument.find({ vendor: vendorId });
    } catch (error: any) {
      throw new Error(`Error fetching vendor documents: ${error.message}`);
    }
  }

  // Update vendor contract by Vendor ID
  async updateVendorContractByVendorId(
    vendorId: string, 
    contractData: Partial<IVendorContract>
  ): Promise<IVendorContract | null> {
    try {
      // Remove vendor field from update data to prevent changing the vendor reference
      const { vendor, ...updateData } = contractData;
      
      return await VendorContract.findOneAndUpdate(
        { vendor: vendorId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor contract: ${error.message}`);
    }
  }

  // Get vendor contract by Vendor ID
  async getVendorContractByVendorId(vendorId: string): Promise<IVendorContract | null> {
    try {
      return await VendorContract.findOne({ vendor: vendorId });
    } catch (error: any) {
      throw new Error(`Error fetching vendor contract: ${error.message}`);
    }
  }

  // Get vendor system info by Vendor ID
  async getVendorSystemInfoByVendorId(vendorId: string): Promise<IVendorSystemInfo | null> {
    try {
      return await VendorSystemInfo.findOne({ vendor: vendorId });
    } catch (error: any) {
      throw new Error(`Error fetching vendor system info: ${error.message}`);
    }
  }

  // Update vendor system info by Vendor ID
  async updateVendorSystemInfoByVendorId(
    vendorId: string, 
    data: Partial<IVendorSystemInfo>
  ): Promise<IVendorSystemInfo | null> {
    try {
      // Remove vendor field from update data to prevent changing the vendor reference
      const { vendor, ...updateData } = data;
      
      return await VendorSystemInfo.findOneAndUpdate(
        { vendor: vendorId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor system info: ${error.message}`);
    }
  }

  // Update vendor verification by Vendor ID (Only for Super Admin)
  async updateVendorVerification(
    vendorId: string, 
    verificationStatus: 'verified' | 'rejected',
    verifiedBy: Types.ObjectId,
    userRole: string,
    rejectionReason?: string
  ): Promise<IVendorStatus> {
    try {
      // Check if user is Super Admin
      if (userRole !== 'super_admin') {
        throw new Error('Only Super Admin can verify or reject vendors');
      }

      const updateData: any = {
        verification_status: verificationStatus,
        verified_by: verifiedBy,
        verification_date: new Date()
      };

      if (verificationStatus === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const updatedStatus = await VendorStatus.findOneAndUpdate(
        { vendor: vendorId },
        updateData,
        { new: true, runValidators: true }
      ).populate('verified_by', 'name email')
       .populate('vendor');

      if (!updatedStatus) {
        throw new Error('Vendor status not found');
      }

      return updatedStatus;
    } catch (error: any) {
      throw new Error(`Error updating vendor verification: ${error.message}`);
    }
  }

  // Get vendor dashboard data
  async getVendorDashboard(createdBy: Types.ObjectId): Promise<IVendorDashboard> {
    try {
      // Get counts with proper filtering
      const [totalVendors, pendingApprovals, activeVendors, rejectedVendors] = await Promise.all([
        VendorDetails.countDocuments(),
        VendorStatus.countDocuments({ verification_status: 'pending' }),
        VendorStatus.countDocuments({ verification_status: 'verified' }),
        VendorStatus.countDocuments({ verification_status: 'rejected' })
      ]);

      // Get vendors with their details for the table
      const vendors = await VendorStatus.aggregate([
        {
          $lookup: {
            from: 'vendordetails',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendor_details'
          }
        },
        {
          $unwind: '$vendor_details'
        },
        {
          $lookup: {
            from: 'vendorcontracts',
            localField: 'vendor',
            foreignField: 'vendor',
            as: 'contracts'
          }
        },
        {
          $addFields: {
            contract_expiry_date: {
              $arrayElemAt: ['$contracts.expiry_date', 0]
            }
          }
        },
        {
          $project: {
            vendor_name: '$vendor_details.vendor_name',
            vendor_category: '$vendor_details.vendor_category',
            status: '$verification_status',
            risk_level: 1,
            contract_expiry_date: 1,
            action: 'edit'
          }
        }
      ]);

      const dashboardData = {
        total_vendors: totalVendors,
        pending_approvals: pendingApprovals,
        active_vendors: activeVendors,
        rejected_vendors: rejectedVendors,
        vendors: vendors,
        createdBy: createdBy
      };

      const dashboard = await VendorDashboard.findOneAndUpdate(
        { createdBy: createdBy },
        dashboardData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!dashboard) {
        throw new Error('Failed to create vendor dashboard');
      }

      return dashboard;
    } catch (error: any) {
      throw new Error(`Error getting vendor dashboard: ${error.message}`);
    }
  }

  // Get vendors pending approval
  async getPendingApprovals(): Promise<IVendorStatus[]> {
    try {
      return await VendorStatus.find({ verification_status: 'pending' })
        .populate('vendor')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
    } catch (error: any) {
      throw new Error(`Error fetching pending approvals: ${error.message}`);
    }
  }

  // Get vendor overview
  async getVendorOverview(): Promise<any> {
    try {
      const vendorsByType = await VendorDetails.aggregate([
        {
          $group: {
            _id: '$vendor_type',
            count: { $sum: 1 }
          }
        }
      ]);

      const vendorsByStatus = await VendorStatus.aggregate([
        {
          $group: {
            _id: '$verification_status',
            count: { $sum: 1 }
          }
        }
      ]);

      const complianceStatus = await VendorCompliance.aggregate([
        {
          $group: {
            _id: '$billing_cycle',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        vendorsByType,
        vendorsByStatus,
        complianceStatus
      };
    } catch (error: any) {
      throw new Error(`Error getting vendor overview: ${error.message}`);
    }
  }

  // Update vendor details by ID
  async updateVendorDetails(id: string, data: Partial<IVendorDetails>): Promise<IVendorDetails | null> {
    try {
      return await VendorDetails.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor details: ${error.message}`);
    }
  }

  // Delete vendor document by ID
  async deleteVendorDocument(id: string): Promise<boolean> {
    try {
      const result = await VendorDocument.findByIdAndDelete(id);
      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting vendor document: ${error.message}`);
    }
  }

  // Get all vendors
  async getAllVendors(): Promise<any[]> {
    try {
      const vendors = await VendorStatus.aggregate([
        {
          $lookup: {
            from: 'vendordetails',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendor_details'
          }
        },
        {
          $unwind: '$vendor_details'
        },
        {
          $lookup: {
            from: 'vendorfinancials',
            localField: 'vendor',
            foreignField: 'vendor',
            as: 'vendor_financials'
          }
        },
        {
          $lookup: {
            from: 'vendorcompliances',
            localField: 'vendor',
            foreignField: 'vendor',
            as: 'vendor_compliance'
          }
        },
        {
          $project: {
            vendor_name: '$vendor_details.vendor_name',
            vendor_type: '$vendor_details.vendor_type',
            vendor_category: '$vendor_details.vendor_category',
            vendor_email: '$vendor_details.vendor_email',
            vendor_phone: '$vendor_details.vendor_phone',
            verification_status: 1,
            risk_level: 1,
            vendor_status_cycle: 1,
            payment_terms: { $arrayElemAt: ['$vendor_financials.payment_terms', 0] },
            billing_cycle: { $arrayElemAt: ['$vendor_compliance.billing_cycle', 0] },
            created_at: '$createdAt'
          }
        }
      ]);

      return vendors;
    } catch (error: any) {
      throw new Error(`Error fetching all vendors: ${error.message}`);
    }
  }

  // Delete vendor (cascade delete)
  async deleteVendor(id: string): Promise<boolean> {
    try {
      const session = await VendorDetails.startSession();
      session.startTransaction();

      try {
        // Delete all related vendor data
        await Promise.all([
          VendorDetails.findByIdAndDelete(id).session(session),
          VendorFinancials.deleteMany({ vendor: id }).session(session),
          VendorCompliance.deleteMany({ vendor: id }).session(session),
          VendorStatus.deleteMany({ vendor: id }).session(session),
          VendorDocument.deleteMany({ vendor: id }).session(session),
          VendorContract.deleteMany({ vendor: id }).session(session),
          VendorSystemInfo.deleteMany({ vendor: id }).session(session)
        ]);

        await session.commitTransaction();
        return true;
      } catch (error: any) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error: any) {
      throw new Error(`Error deleting vendor: ${error.message}`);
    }
  }

  // Approve vendor by Vendor ID
  async approveVendor(vendorId: string): Promise<IVendorStatus | null> {
    try {
      return await VendorStatus.findOneAndUpdate(
        { vendor: vendorId },
        { 
          verification_status: 'verified',
          verification_date: new Date()
        },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error approving vendor: ${error.message}`);
    }
  }

  // Activate vendor by Vendor ID
  async activateVendor(vendorId: string): Promise<IVendorStatus | null> {
    try {
      return await VendorStatus.findOneAndUpdate(
        { vendor: vendorId },
        { 
          verification_status: 'verified',
          risk_level: 'low'
        },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error activating vendor: ${error.message}`);
    }
  }

  // Deactivate vendor by Vendor ID
  async deactivateVendor(vendorId: string): Promise<IVendorStatus | null> {
    try {
      return await VendorStatus.findOneAndUpdate(
        { vendor: vendorId },
        { 
          verification_status: 'rejected',
          risk_level: 'high',
          rejection_reason: 'Vendor deactivated by admin'
        },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error deactivating vendor: ${error.message}`);
    }
  }

  // Search vendors with filters
  async searchVendors(filters: {
    vendor_type?: string;
    verification_status?: string;
    risk_level?: string;
    vendor_category?: string;
    search?: string;
  }): Promise<any[]> {
    try {
      const matchStage: any = {};

      if (filters.vendor_type) {
        matchStage['vendor_details.vendor_type'] = filters.vendor_type;
      }

      if (filters.verification_status) {
        matchStage.verification_status = filters.verification_status;
      }

      if (filters.risk_level) {
        matchStage.risk_level = filters.risk_level;
      }

      if (filters.vendor_category) {
        matchStage['vendor_details.vendor_category'] = filters.vendor_category;
      }

      if (filters.search) {
        matchStage['$or'] = [
          { 'vendor_details.vendor_name': { $regex: filters.search, $options: 'i' } },
          { 'vendor_details.vendor_email': { $regex: filters.search, $options: 'i' } },
          { 'vendor_details.vendor_contact_name': { $regex: filters.search, $options: 'i' } }
        ];
      }

      const pipeline: any[] = [
        {
          $lookup: {
            from: 'vendordetails',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendor_details'
          }
        },
        { $unwind: '$vendor_details' }
      ];

      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      pipeline.push({
        $project: {
          vendor_name: '$vendor_details.vendor_name',
          vendor_type: '$vendor_details.vendor_type',
          vendor_category: '$vendor_details.vendor_category',
          vendor_email: '$vendor_details.vendor_email',
          vendor_phone: '$vendor_details.vendor_phone',
          verification_status: 1,
          risk_level: 1,
          vendor_status_cycle: 1,
          created_at: '$createdAt'
        }
      });

      return await VendorStatus.aggregate(pipeline);
    } catch (error: any) {
      throw new Error(`Error searching vendors: ${error.message}`);
    }
  }

  // Get vendor contract by ID (for backward compatibility)
  async getVendorContractById(id: string): Promise<IVendorContract | null> {
    try {
      return await VendorContract.findById(id);
    } catch (error: any) {
      throw new Error(`Error fetching vendor contract: ${error.message}`);
    }
  }

  // Get vendor system info by ID (for backward compatibility)
  async getVendorSystemInfoById(id: string): Promise<IVendorSystemInfo | null> {
    try {
      return await VendorSystemInfo.findById(id);
    } catch (error: any) {
      throw new Error(`Error fetching vendor system info: ${error.message}`);
    }
  }
// In VendorService class

// Bulk update vendor details, status, and contract
async bulkUpdateVendor(
  vendorId: string,
  updateData: {
    vendorDetails?: Partial<IVendorDetails>;
    vendorStatus?: Partial<IVendorStatus>;
    vendorContract?: Partial<IVendorContract>;
  }
): Promise<{
  vendorDetails: IVendorDetails | null;
  vendorStatus: IVendorStatus | null;
  vendorContract: IVendorContract | null;
}> {
  const session = await VendorDetails.startSession();
  session.startTransaction();

  try {
    // Validate vendor exists
    const vendorExists = await VendorDetails.findById(vendorId);
    if (!vendorExists) {
      throw new Error('Vendor not found');
    }

    const updatePromises = [];

    // Update vendor details if provided
    if (updateData.vendorDetails) {
      updatePromises.push(
        VendorDetails.findByIdAndUpdate(
          vendorId,
          updateData.vendorDetails,
          { new: true, runValidators: true, session }
        )
      );
    } else {
      updatePromises.push(Promise.resolve(null));
    }

    // Update vendor status if provided
    if (updateData.vendorStatus) {
      updatePromises.push(
        VendorStatus.findOneAndUpdate(
          { vendor: vendorId },
          updateData.vendorStatus,
          { new: true, runValidators: true, session }
        )
      );
    } else {
      updatePromises.push(Promise.resolve(null));
    }

    // Update vendor contract if provided
    if (updateData.vendorContract) {
      updatePromises.push(
        VendorContract.findOneAndUpdate(
          { vendor: vendorId },
          updateData.vendorContract,
          { new: true, runValidators: true, session }
        )
      );
    } else {
      updatePromises.push(Promise.resolve(null));
    }

    const [updatedDetails, updatedStatus, updatedContract] = await Promise.all(updatePromises);

    await session.commitTransaction();

    return {
      vendorDetails: updatedDetails,
      vendorStatus: updatedStatus,
      vendorContract: updatedContract
    };

  } catch (error: any) {
    await session.abortTransaction();
    throw new Error(`Error bulk updating vendor: ${error.message}`);
  } finally {
    session.endSession();
  }
}
  // Update vendor system info by ID (for backward compatibility)
  async updateVendorSystemInfo(id: string, data: Partial<IVendorSystemInfo>): Promise<IVendorSystemInfo | null> {
    try {
      return await VendorSystemInfo.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      throw new Error(`Error updating vendor system info: ${error.message}`);
    }
  }
}

// Validation Service
class VendorValidationService {
  static validateVendorDetails(data: Partial<IVendorDetails>): void {
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

    if (!data.vendor_name) {
      throw new Error('Vendor name is required');
    }

    if (!data.vendor_billing_name) {
      throw new Error('Vendor billing name is required');
    }

    if (!data.vendor_type) {
      throw new Error('Vendor type is required');
    }

    if (!data.vendor_category) {
      throw new Error('Vendor category is required');
    }

    if (!data.vendor_contact_name) {
      throw new Error('Vendor contact name is required');
    }

    if (!data.vendor_address) {
      throw new Error('Vendor address is required');
    }
  }

  static validateFinancials(data: Partial<IVendorFinancials>): void {
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
  }

  static validateCompliance(data: Partial<IVendorCompliance>): void {
    if (!data.gst_details) {
      throw new Error('GST details are required');
    }

    if (!data.pan_details) {
      throw new Error('PAN details are required');
    }

    if (data.tds_rate === undefined || data.tds_rate === null) {
      throw new Error('TDS rate is required');
    }

    if (data.tds_rate < 0 || data.tds_rate > 100) {
      throw new Error('TDS rate must be between 0 and 100');
    }
  }
}