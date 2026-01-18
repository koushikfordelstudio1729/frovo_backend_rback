import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendCreated, sendError } from '../utils/response.util';
import { fieldOpsService } from '../services/fieldops.service';
import { FieldAgent } from '../models/Warehouse.model';
import { User } from '../models';

export class FieldOpsController {

  // Helper method to get FieldAgent ID from User ID (auto-creates if not exists)
  private async getFieldAgentId(userId: string): Promise<string> {
    let agent = await FieldAgent.findOne({ userId });

    if (!agent) {
      // Auto-create FieldAgent record if it doesn't exist
      const user = await User.findById(userId).select('name email phone');
      if (!user) {
        throw new Error('User not found');
      }

      agent = await FieldAgent.create({
        userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        assignedRoutes: [],
        isActive: true,
        createdBy: userId
      });
    }

    return agent._id.toString();
  }

  // ==================== DASHBOARD ====================
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // Ensure FieldAgent record exists (auto-create if needed)
      await this.getFieldAgentId(req.user._id.toString());

      // Pass User ID to service (tasks are assigned to Users now)
      const dashboard = await fieldOpsService.getDashboard(req.user._id.toString());
      return sendSuccess(res, dashboard, 'Dashboard data retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get dashboard', 500);
    }
  });

  // ==================== TASKS ====================
  getTasks = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // Ensure FieldAgent record exists (auto-create if needed)
      await this.getFieldAgentId(req.user._id.toString());

      const filters = {
        status: req.query.status as string,
        type: req.query.type as string,
        date: req.query.date as string
      };

      // Pass User ID to service (tasks are assigned to Users now)
      const tasks = await fieldOpsService.getTasks(req.user._id.toString(), filters);
      return sendSuccess(res, tasks, 'Tasks retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get tasks', 500);
    }
  });

  // ==================== WAREHOUSE PICKUPS ====================
  getWarehousePickups = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // Ensure FieldAgent record exists (auto-create if needed)
      await this.getFieldAgentId(req.user._id.toString());

      // Pass User ID to service (dispatch orders are assigned to Users)
      const status = req.query.status as string;
      const pickups = await fieldOpsService.getWarehousePickups(req.user._id.toString(), status);
      return sendSuccess(res, pickups, 'Warehouse pickups retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get warehouse pickups', 500);
    }
  });

  getWarehousePickupById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const id = req.params.id as string;
      const pickup = await fieldOpsService.getWarehousePickupById(id);
      return sendSuccess(res, pickup, 'Warehouse pickup retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get warehouse pickup', 500);
    }
  });

  markPickupAsCollected = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const id = req.params.id as string;
      // Ensure FieldAgent record exists
      await this.getFieldAgentId(req.user._id.toString());

      // Pass User ID to service
      const result = await fieldOpsService.markPickupAsCollected(id, req.user._id.toString(), req.body);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to mark pickup as collected', 500);
    }
  });

  // ==================== HANDOVER ====================
  createHandover = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // Ensure FieldAgent record exists
      await this.getFieldAgentId(req.user._id.toString());

      // Pass User ID to service
      const handover = await fieldOpsService.createHandover(req.user._id.toString(), req.body);
      return sendCreated(res, handover, 'Handover summary created successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to create handover', 500);
    }
  });

  // ==================== ROUTES ====================
  getMyRoutes = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const routes = await fieldOpsService.getMyRoutes(agentId);
      return sendSuccess(res, routes, 'Routes retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get routes', 500);
    }
  });

  getRouteMachines = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const routeId = req.params.routeId as string;
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const machines = await fieldOpsService.getRouteMachines(routeId, agentId);
      return sendSuccess(res, machines, 'Route machines retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get route machines', 500);
    }
  });

  // ==================== MACHINE VERIFICATION ====================
  verifyMachine = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const result = await fieldOpsService.verifyMachine(req.body, agentId);
      return sendSuccess(res, result, result.valid ? 'Machine verified successfully' : 'Machine verification failed');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to verify machine', 500);
    }
  });

  // ==================== MACHINE DETAILS ====================
  getMachineDetails = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
      const machine = await fieldOpsService.getMachineDetails(machineId);
      return sendSuccess(res, machine, 'Machine details retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get machine details', 500);
    }
  });

  getMachineHealth = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
      const health = await fieldOpsService.getMachineHealth(machineId);
      return sendSuccess(res, health, 'Machine health retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get machine health', 500);
    }
  });

  // ==================== REFILL ====================
  getMachineRefillData = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
      const refillData = await fieldOpsService.getMachineRefillData(machineId);
      return sendSuccess(res, refillData, 'Machine refill data retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get refill data', 500);
    }
  });

  getSlotDetails = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
    const slotId = req.params.slotId as string;
      const slotDetails = await fieldOpsService.getSlotDetails(machineId, slotId);
      return sendSuccess(res, slotDetails, 'Slot details retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get slot details', 500);
    }
  });

  submitRefill = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const result = await fieldOpsService.submitRefill(machineId, agentId, req.body);
      return sendCreated(res, result, result.message);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to submit refill', 500);
    }
  });

  getRefillSummary = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const refillId = req.params.refillId as string;
      const summary = await fieldOpsService.getRefillSummary(refillId);
      return sendSuccess(res, summary, 'Refill summary retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get refill summary', 500);
    }
  });

  // ==================== SKIP MACHINE ====================
  skipMachine = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const result = await fieldOpsService.skipMachine(machineId, agentId, req.body);
      return sendSuccess(res, result, result.message);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to skip machine', 500);
    }
  });

  // ==================== MAINTENANCE ====================
  raiseIssue = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const machineId = req.params.machineId as string;
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const result = await fieldOpsService.raiseIssue(machineId, agentId, req.body);
      return sendCreated(res, result, result.message);
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to raise issue', 500);
    }
  });

  // ==================== WORK SUMMARY ====================
  getWorkSummary = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const date = req.query.date as string;
      const summary = await fieldOpsService.getWorkSummary(agentId, date);
      return sendSuccess(res, summary, 'Work summary retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get work summary', 500);
    }
  });

  // ==================== NOTIFICATIONS ====================
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;
      const notifications = await fieldOpsService.getNotifications(agentId, read);
      return sendSuccess(res, notifications, 'Notifications retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get notifications', 500);
    }
  });

  markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // TODO: Implement notification marking logic
      return sendSuccess(res, { message: 'Marked as read' }, 'Notification marked as read');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to mark notification as read', 500);
    }
  });

  markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // TODO: Implement notification marking logic
      return sendSuccess(res, { message: 'All marked as read' }, 'All notifications marked as read');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to mark all notifications as read', 500);
    }
  });

  // ==================== PROFILE ====================
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const agentId = await this.getFieldAgentId(req.user._id.toString());
      const profile = await fieldOpsService.getProfile(agentId);
      return sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get profile', 500);
    }
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      // TODO: Implement profile update logic
      return sendSuccess(res, { message: 'Profile updated' }, 'Profile updated successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to update profile', 500);
    }
  });

  // ==================== HELP & SUPPORT ====================
  getHelpSections = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    try {
      const sections = {
        sections: [
          {
            title: 'SOP Status',
            items: []
          },
          {
            title: 'FAQs',
            items: [
              {
                question: "You're the signatory - what is it?",
                answer: "How to request an on-demand refund with this feature"
              },
              {
                question: "How to report an emergency situation?",
                answer: "Use the EMERGENCY Contacts section below or call the helpline"
              }
            ]
          },
          {
            title: 'EMERGENCY Contacts',
            items: [
              { name: 'Support Helpline', number: '+91 1234567890' },
              { name: 'Warehouse Manager', number: '+91 9876543210' }
            ]
          }
        ]
      };
      return sendSuccess(res, sections, 'Help sections retrieved successfully');
    } catch (error) {
      return sendError(res, error instanceof Error ? error.message : 'Failed to get help sections', 500);
    }
  });
}

export const fieldOpsController = new FieldOpsController();
