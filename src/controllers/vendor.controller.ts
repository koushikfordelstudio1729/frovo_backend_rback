// controllers/vendor.controller.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VendorService } from '../services/vendor.service';

const vendorService = new VendorService();

export class VendorController {
  
  // Utility function to safely extract user
  private getLoggedInUser(req: Request): { _id: Types.ObjectId; roles: any[] } {
    const user = (req as any).user;
    
    if (!user || !user._id) {
      throw new Error('User authentication required');
    }
    
    return {
      _id: user._id,
      roles: user.roles || []
    };
  }

  // Utility function to get vendor ID from headers
  private getVendorIdFromHeader(req: Request): string {
    const vendorId = req.headers['x-vendor-id'] as string;
    if (!vendorId) {
      throw new Error('Vendor ID is required in headers (x-vendor-id)');
    }
    return vendorId;
  }

  // Complete Vendor Creation
  async createCompleteVendor(req: Request, res: Response) {
    try {
      const { _id: createdBy } = this.getLoggedInUser(req);
      const result = await vendorService.createCompleteVendor(req.body, createdBy);

      res.status(201).json({
        success: true,
        message: 'Vendor created successfully with all components',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 1: Create Vendor Details
  async createVendorDetails(req: Request, res: Response) {
    try {
      const { _id: createdBy } = this.getLoggedInUser(req);
      const vendorDetails = await vendorService.createVendorDetails(req.body, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor details created successfully',
        data: vendorDetails
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 2: Create Vendor Financials
  async createVendorFinancials(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { _id: createdBy } = this.getLoggedInUser(req);
      
      const vendorFinancials = await vendorService.createVendorFinancials({
        ...req.body,
        vendor: vendorId
      }, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor financials created successfully',
        data: vendorFinancials
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 3: Create Vendor Compliance
  async createVendorCompliance(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { _id: createdBy } = this.getLoggedInUser(req);
      
      const vendorCompliance = await vendorService.createVendorCompliance({
        ...req.body,
        vendor: vendorId
      }, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor compliance created successfully',
        data: vendorCompliance
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 4: Create Vendor Status
  async createVendorStatus(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { _id: createdBy } = this.getLoggedInUser(req);
      
      const vendorStatus = await vendorService.createVendorStatus({
        ...req.body,
        vendor: vendorId
      }, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor status created successfully with pending verification',
        data: vendorStatus
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 5: Create Vendor Document
  async createVendorDocument(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { _id: createdBy } = this.getLoggedInUser(req);
      
      const vendorDocument = await vendorService.createVendorDocument({
        ...req.body,
        vendor: vendorId
      }, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor document created successfully',
        data: vendorDocument
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 6: Create Vendor Contract
  async createVendorContract(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { _id: createdBy } = this.getLoggedInUser(req);
      
      const vendorContract = await vendorService.createVendorContract({
        ...req.body,
        vendor: vendorId
      }, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor contract created successfully',
        data: vendorContract
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Step 7: Create Vendor System Info
  async createVendorSystemInfo(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { _id: createdBy } = this.getLoggedInUser(req);
      
      const vendorSystemInfo = await vendorService.createVendorSystemInfo({
        ...req.body,
        vendor: vendorId
      }, createdBy);
      
      res.status(201).json({
        success: true,
        message: 'Vendor system info created successfully',
        data: vendorSystemInfo
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Details by ID
  async getVendorDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const vendorDetails = await vendorService.getVendorDetailsById(id);
      
      if (!vendorDetails) {
        return res.status(404).json({
          success: false,
          message: 'Vendor details not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendorDetails
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Financials by Vendor ID
  async getVendorFinancials(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const vendorFinancials = await vendorService.getVendorFinancialsByVendorId(vendorId);
      
      if (!vendorFinancials) {
        return res.status(404).json({
          success: false,
          message: 'Vendor financials not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendorFinancials
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Compliance by Vendor ID
  async getVendorCompliance(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const vendorCompliance = await vendorService.getVendorComplianceByVendorId(vendorId);
      
      if (!vendorCompliance) {
        return res.status(404).json({
          success: false,
          message: 'Vendor compliance not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendorCompliance
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Status by Vendor ID
  async getVendorStatus(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const userRole = (req as any).user.roles[0]?.key;
      
      const vendorStatus = await vendorService.getVendorStatusByVendorId(vendorId, userRole);
      
      if (!vendorStatus) {
        return res.status(404).json({
          success: false,
          message: 'Vendor status not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendorStatus
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor Status by Vendor ID
  async updateVendorStatus(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const userRole = (req as any).user.roles[0]?.key;
      
      const updatedStatus = await vendorService.updateVendorStatusByVendorId(vendorId, req.body, userRole);
      
      if (!updatedStatus) {
        return res.status(404).json({
          success: false,
          message: 'Vendor status not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor status updated successfully',
        data: updatedStatus
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Documents by Vendor ID
  async getVendorDocuments(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const documents = await vendorService.getVendorDocuments(vendorId);
      
      res.status(200).json({
        success: true,
        data: documents
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor Contract by Vendor ID
  async updateVendorContract(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const updatedContract = await vendorService.updateVendorContractByVendorId(vendorId, req.body);
      
      if (!updatedContract) {
        return res.status(404).json({
          success: false,
          message: 'Vendor contract not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor contract updated successfully',
        data: updatedContract
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Contract by Vendor ID
  async getVendorContract(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const vendorContract = await vendorService.getVendorContractByVendorId(vendorId);
      
      if (!vendorContract) {
        return res.status(404).json({
          success: false,
          message: 'Vendor contract not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendorContract
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Dashboard
  async getVendorDashboard(req: Request, res: Response) {
    try {
      const createdBy = (req as any).user._id;
      const dashboard = await vendorService.getVendorDashboard(createdBy);

      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Overview
  async getVendorOverview(req: Request, res: Response) {
    try {
      const overviewData = await vendorService.getVendorOverview();
      
      res.status(200).json({
        success: true,
        data: overviewData
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor Details by ID
  async updateVendorDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedDetails = await vendorService.updateVendorDetails(id, req.body);
      
      if (!updatedDetails) {
        return res.status(404).json({
          success: false,
          message: 'Vendor details not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor details updated successfully',
        data: updatedDetails
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor Financials by Vendor ID
  async updateVendorFinancials(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const updatedFinancials = await vendorService.updateVendorFinancialsByVendorId(vendorId, req.body);
      
      if (!updatedFinancials) {
        return res.status(404).json({
          success: false,
          message: 'Vendor financials not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor financials updated successfully',
        data: updatedFinancials
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor Compliance by Vendor ID
  async updateVendorCompliance(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const updatedCompliance = await vendorService.updateVendorComplianceByVendorId(vendorId, req.body);
      
      if (!updatedCompliance) {
        return res.status(404).json({
          success: false,
          message: 'Vendor compliance not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor compliance updated successfully',
        data: updatedCompliance
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete Vendor Document by ID
  async deleteVendorDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await vendorService.deleteVendorDocument(id);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Vendor document not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor document deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor System Info by Vendor ID
  async getVendorSystemInfo(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const systemInfo = await vendorService.getVendorSystemInfoByVendorId(vendorId);
      
      if (!systemInfo) {
        return res.status(404).json({
          success: false,
          message: 'Vendor system info not found'
        });
      }

      res.status(200).json({
        success: true,
        data: systemInfo
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor System Info by Vendor ID
  async updateVendorSystemInfo(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const updatedSystemInfo = await vendorService.updateVendorSystemInfoByVendorId(vendorId, req.body);
      
      if (!updatedSystemInfo) {
        return res.status(404).json({
          success: false,
          message: 'Vendor system info not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor system info updated successfully',
        data: updatedSystemInfo
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor Verification (Super Admin only)
  async updateVendorVerification(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const { verification_status, rejection_reason } = req.body;
      const verifiedBy = (req as any).user._id;
      const userRole = (req as any).user.roles[0]?.key;

      if (!['verified', 'rejected'].includes(verification_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification status'
        });
      }

      const updatedStatus = await vendorService.updateVendorVerification(
        vendorId,
        verification_status as 'verified' | 'rejected',
        verifiedBy,
        userRole,
        rejection_reason
      );

      res.status(200).json({
        success: true,
        message: `Vendor ${verification_status} successfully`,
        data: updatedStatus
      });
    } catch (error: any) {
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

  // Get Pending Approvals (Super Admin only)
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const pendingApprovals = await vendorService.getPendingApprovals();

      res.status(200).json({
        success: true,
        data: pendingApprovals
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get All Vendors
  async getAllVendors(req: Request, res: Response) {
    try {
      const vendors = await vendorService.getAllVendors();
      
      res.status(200).json({
        success: true,
        data: vendors
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete Vendor
  async deleteVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await vendorService.deleteVendor(id);
      
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
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Approve Vendor
  async approveVendor(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const result = await vendorService.approveVendor(vendorId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor approved successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Activate Vendor
  async activateVendor(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const result = await vendorService.activateVendor(vendorId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor activated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Deactivate Vendor
  async deactivateVendor(req: Request, res: Response) {
    try {
      const vendorId = this.getVendorIdFromHeader(req);
      const result = await vendorService.deactivateVendor(vendorId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor deactivated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}