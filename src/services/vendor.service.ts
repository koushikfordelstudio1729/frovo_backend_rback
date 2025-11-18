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
  IVendorSystemInfo
} from '../models/Vendor.model';

export class VendorService {
  
  // Step 1: Create Vendor Details
  async createVendorDetails(vendorDetailsData: Partial<IVendorDetails>): Promise<IVendorDetails> {
    try {
      const vendorDetails = new VendorDetails(vendorDetailsData);
      return await vendorDetails.save();
    } catch (error) {
      throw new Error(`Error creating vendor details: ${error.message}`);
    }
  }

  // Step 2: Create Vendor Financials
  async createVendorFinancials(financialsData: Partial<IVendorFinancials>): Promise<IVendorFinancials> {
    try {
      const vendorFinancials = new VendorFinancials(financialsData);
      return await vendorFinancials.save();
    } catch (error) {
      throw new Error(`Error creating vendor financials: ${error.message}`);
    }
  }

  // Step 3: Create Vendor Compliance
  async createVendorCompliance(complianceData: Partial<IVendorCompliance>): Promise<IVendorCompliance> {
    try {
      const vendorCompliance = new VendorCompliance(complianceData);
      return await vendorCompliance.save();
    } catch (error) {
      throw new Error(`Error creating vendor compliance: ${error.message}`);
    }
  }

  // Step 4: Create Vendor Status
  async createVendorStatus(statusData: Partial<IVendorStatus>): Promise<IVendorStatus> {
    try {
      const vendorStatus = new VendorStatus(statusData);
      return await vendorStatus.save();
    } catch (error) {
      throw new Error(`Error creating vendor status: ${error.message}`);
    }
  }

  // Step 5: Create Vendor Document
  async createVendorDocument(documentData: Partial<IVendorDocument>): Promise<IVendorDocument> {
    try {
      const vendorDocument = new VendorDocument(documentData);
      return await vendorDocument.save();
    } catch (error) {
      throw new Error(`Error creating vendor document: ${error.message}`);
    }
  }

  // Step 6: Create Vendor Contract
  async createVendorContract(contractData: Partial<IVendorContract>): Promise<IVendorContract> {
    try {
      const vendorContract = new VendorContract(contractData);
      return await vendorContract.save();
    } catch (error) {
      throw new Error(`Error creating vendor contract: ${error.message}`);
    }
  }

  // Step 7: Create Vendor System Info
  async createVendorSystemInfo(systemInfoData: Partial<IVendorSystemInfo>): Promise<IVendorSystemInfo> {
    try {
      const vendorSystemInfo = new VendorSystemInfo(systemInfoData);
      return await vendorSystemInfo.save();
    } catch (error) {
      throw new Error(`Error creating vendor system info: ${error.message}`);
    }
  }

  // Get all vendor details by ID
  async getVendorDetailsById(id: string): Promise<IVendorDetails | null> {
    try {
      return await VendorDetails.findById(id);
    } catch (error) {
      throw new Error(`Error fetching vendor details: ${error.message}`);
    }
  }

  // Get vendor financials by ID
  async getVendorFinancialsById(id: string): Promise<IVendorFinancials | null> {
    try {
      return await VendorFinancials.findById(id);
    } catch (error) {
      throw new Error(`Error fetching vendor financials: ${error.message}`);
    }
  }

  // Get vendor compliance by ID
  async getVendorComplianceById(id: string): Promise<IVendorCompliance | null> {
    try {
      return await VendorCompliance.findById(id);
    } catch (error) {
      throw new Error(`Error fetching vendor compliance: ${error.message}`);
    }
  }

  // Update vendor status
  async updateVendorStatus(id: string, statusData: Partial<IVendorStatus>): Promise<IVendorStatus | null> {
    try {
      return await VendorStatus.findByIdAndUpdate(
        id,
        statusData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error updating vendor status: ${error.message}`);
    }
  }

  // Get all documents for a vendor
  async getVendorDocuments(vendorId: string): Promise<IVendorDocument[]> {
    try {
      return await VendorDocument.find({ vendor: vendorId });
    } catch (error) {
      throw new Error(`Error fetching vendor documents: ${error.message}`);
    }
  }

  // Update vendor contract
  async updateVendorContract(id: string, contractData: Partial<IVendorContract>): Promise<IVendorContract | null> {
    try {
      return await VendorContract.findByIdAndUpdate(
        id,
        contractData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw new Error(`Error updating vendor contract: ${error.message}`);
    }
  }
}