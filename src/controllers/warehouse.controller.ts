// controllers/warehouse.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { warehouseService } from "../services/warehouse.service";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendBadRequest,
} from "../utils/responseHandlers";
import { checkPermission } from "../middleware/auth.middleware";
import { DocumentUploadService } from "../services/documentUpload.service";

// Screen 1: Dashboard
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { date, category, partner, warehouseId, ...otherFilters } = req.query;

    const filters: any = { ...otherFilters };

    if (date) filters.dateRange = date as string;
    if (category) filters.category = category as string;
    if (partner) filters.partner = partner as string;

    const dashboard = await warehouseService.getDashboard(warehouseId as string, filters);
    sendSuccess(res, dashboard, "Dashboard data retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get dashboard data", 500);
  }
});

// Screen 2: Inbound Logistics - Purchase Orders
// controllers/warehouse.controller.ts
export const createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for creating purchase orders
  if (!checkPermission(req.user, "purchase_orders:create")) {
    return sendError(res, "Insufficient permissions to create purchase orders", 403);
  }

  try {
    const uploadService = new DocumentUploadService();
    const files = (req as any).files as Express.Multer.File[] | undefined;

    console.log("📥 Request received:", {
      hasFiles: !!files,
      fileCount: files?.length || 0,
      contentType: req.headers["content-type"],
    });

    // Parse po_line_items if it's a string (from multipart/form-data)
    const poData = { ...req.body };
    if (typeof req.body.po_line_items === "string") {
      try {
        poData.po_line_items = JSON.parse(req.body.po_line_items);
      } catch (parseError) {
        return sendBadRequest(res, "Invalid po_line_items format. Must be valid JSON.");
      }
    }

    // Handle file uploads if present
    if (files && files.length > 0) {
      console.log("📤 Processing file uploads...");

      // Group files by line item index (field name pattern: images_0, images_1, etc.)
      const filesByLineItem: { [key: number]: Express.Multer.File[] } = {};

      for (const file of files) {
        // Extract line item index from field name (e.g., "images_0" -> 0)
        const match = file.fieldname.match(/images_(\d+)/);
        if (match) {
          const lineItemIndex = parseInt(match[1], 10);
          if (!filesByLineItem[lineItemIndex]) {
            filesByLineItem[lineItemIndex] = [];
          }
          filesByLineItem[lineItemIndex].push(file);
        }
      }

      console.log(
        "📊 Files grouped by line item:",
        Object.keys(filesByLineItem).map(key => ({
          lineItem: key,
          fileCount: filesByLineItem[parseInt(key)].length,
        }))
      );

      // Upload files to Cloudinary and attach to line items
      for (const [lineItemIndex, lineItemFiles] of Object.entries(filesByLineItem)) {
        const index = parseInt(lineItemIndex, 10);

        if (!poData.po_line_items[index]) {
          console.warn(
            `⚠️ Warning: Files uploaded for line item ${index}, but line item doesn't exist`
          );
          continue;
        }

        // Upload each file for this line item
        const uploadedImages = [];
        for (const file of lineItemFiles) {
          try {
            console.log(`⬆️ Uploading ${file.originalname} for line item ${index}...`);

            const uploadResult = await uploadService.uploadToCloudinary(
              file.buffer,
              file.originalname,
              "frovo/purchase_orders"
            );

            uploadedImages.push({
              file_name: file.originalname,
              file_url: uploadResult.url,
              cloudinary_public_id: uploadResult.publicId,
              file_size: file.size,
              mime_type: file.mimetype,
              uploaded_at: new Date(),
            });

            console.log(`✅ Uploaded ${file.originalname} successfully`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${file.originalname}:`, uploadError);
            return sendError(res, `Failed to upload file ${file.originalname}`, 500);
          }
        }

        // Attach images to the corresponding line item
        poData.po_line_items[index].images = uploadedImages;
      }

      console.log("✅ All files uploaded successfully");
    }

    console.log("📥 Final PO data:", {
      vendor: poData.vendor,
      po_line_items_count: poData.po_line_items?.length || 0,
      all_fields: Object.keys(poData),
    });

    // Check if user is warehouse staff by checking roles array
    const isWarehouseStaff = req.user.roles?.some((role: any) => {
      // Check if role has systemRole property and it's warehouse_staff
      return role.systemRole === "warehouse_staff";
    });

    // If user is warehouse staff, enforce draft status only
    if (isWarehouseStaff) {
      poData.po_status = "draft"; // Force draft status for warehouse staff
      console.log("🔒 Warehouse staff: PO status forced to draft");
    }

    const result = await warehouseService.createPurchaseOrder(poData, req.user._id);

    console.log("📤 Service result:", {
      po_number: result.po_number,
      warehouse: result.warehouse || "Not assigned",
      line_items_count: result.po_line_items?.length || 0,
      line_items: result.po_line_items,
    });

    // Format the response to include complete vendor information
    const responseData = {
      ...result.toObject(),
      vendor: result.vendor
        ? {
            _id: (result.vendor as any)._id,
            vendor_name: (result.vendor as any).vendor_name,
            vendor_billing_name: (result.vendor as any).vendor_billing_name,
            vendor_email: (result.vendor as any).vendor_email,
            vendor_phone: (result.vendor as any).vendor_phone,
            vendor_category: (result.vendor as any).vendor_category,
            gst_number: (result.vendor as any).gst_number,
            verification_status: (result.vendor as any).verification_status,
            vendor_address: (result.vendor as any).vendor_address,
            vendor_contact: (result.vendor as any).vendor_contact,
            vendor_id: (result.vendor as any).vendor_id,
          }
        : null,
    };

    console.log("📄 Final response data:", {
      line_items_count: responseData.po_line_items?.length || 0,
      line_items: responseData.po_line_items,
    });

    return sendCreated(res, responseData, "Purchase order created successfully");
  } catch (error) {
    console.error("❌ Controller error:", error);
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to create purchase order",
      500
    );
  }
});
// GRN Management
export const createGRN = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for creating GRN
  if (!checkPermission(req.user, "grn:create")) {
    return sendError(res, "Insufficient permissions to create GRN", 403);
  }

  try {
    const { purchaseOrderId } = req.params;

    if (!purchaseOrderId) {
      return sendBadRequest(res, "Purchase order ID is required");
    }

    // Get uploaded file if present (uploadGRN uses .fields())
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const uploadedFile = files?.document?.[0];

    // Quantities are automatically parsed by the validator

    const result = await warehouseService.createGRN(
      purchaseOrderId,
      req.body,
      req.user._id,
      uploadedFile
    );
    return sendCreated(res, result, "GRN created successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to create GRN", 500);
  }
});

export const getGRNById = asyncHandler(async (req: Request, res: Response) => {
  // Check permission for viewing GRN
  if (!req.user || !checkPermission(req.user, "grn:view")) {
    return sendError(res, "Insufficient permissions to view GRN", 403);
  }

  try {
    const { id } = req.params;

    if (!id) {
      return sendBadRequest(res, "GRN ID is required");
    }

    const grn = await warehouseService.getGRNById(id);

    if (!grn) {
      return sendNotFound(res, "GRN not found");
    }

    return sendSuccess(res, grn, "GRN retrieved successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to get GRN", 500);
  }
});

export const getGRNs = asyncHandler(async (req: Request, res: Response) => {
  // Check permission for viewing GRNs
  if (!req.user || !checkPermission(req.user, "grn:view")) {
    return sendError(res, "Insufficient permissions to view GRNs", 403);
  }

  try {
    const grns = await warehouseService.getGRNs(req.query);
    return sendSuccess(res, grns, "GRNs retrieved successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to get GRNs", 500);
  }
});

export const updateGRNStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for editing GRN
  if (!checkPermission(req.user, "grn:edit")) {
    return sendError(res, "Insufficient permissions to update GRN status", 403);
  }

  try {
    const { id } = req.params;
    const { qc_status, remarks } = req.body;

    if (!id) {
      return sendBadRequest(res, "GRN ID is required");
    }

    if (!qc_status) {
      return sendBadRequest(res, "QC status is required");
    }

    const result = await warehouseService.updateGRNStatus(id, qc_status, remarks);
    return sendSuccess(res, result, "GRN status updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update GRN status",
      500
    );
  }
});

export const getPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  // Check permission for viewing purchase orders
  if (!req.user || !checkPermission(req.user, "purchase_orders:view")) {
    return sendError(res, "Insufficient permissions to view purchase orders", 403);
  }

  try {
    const { warehouseId, ...filters } = req.query;
    const result = await warehouseService.getPurchaseOrders(warehouseId as string, filters);
    return sendSuccess(res, result, "Purchase orders fetched successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to fetch purchase orders",
      500
    );
  }
});

export const getPurchaseOrderById = asyncHandler(async (req: Request, res: Response) => {
  // Check permission for viewing purchase orders
  if (!req.user || !checkPermission(req.user, "purchase_orders:view")) {
    return sendError(res, "Insufficient permissions to view purchase orders", 403);
  }

  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Purchase order ID is required");

  try {
    const result = await warehouseService.getPurchaseOrderById(id);
    if (!result) return sendNotFound(res, "Purchase order not found");
    return sendSuccess(res, result, "Purchase order fetched successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to fetch purchase order",
      500
    );
  }
});

export const updatePurchaseOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for updating PO status
  if (!checkPermission(req.user, "purchase_orders:status_update")) {
    return sendError(res, "Insufficient permissions to update purchase order status", 403);
  }

  const { id } = req.params;
  const { po_status, remarks } = req.body;

  if (!id) return sendBadRequest(res, "Purchase order ID is required");
  if (!po_status) return sendBadRequest(res, "Purchase order status is required");

  try {
    const result = await warehouseService.updatePurchaseOrderStatus(id, po_status, remarks);
    if (!result) return sendNotFound(res, "Purchase order not found");
    return sendSuccess(res, result, "Purchase order status updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update purchase order status",
      500
    );
  }
});

export const deletePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for deleting purchase orders
  if (!checkPermission(req.user, "purchase_orders:delete")) {
    return sendError(res, "Insufficient permissions to delete purchase orders", 403);
  }

  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Purchase order ID is required");

  try {
    // You'll need to add this method to your warehouse service
    await warehouseService.deletePurchaseOrder(id);
    return sendSuccess(res, null, "Purchase order deleted successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to delete purchase order",
      500
    );
  }
});

// Screen 3: Outbound Logistics
export const createDispatch = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  try {
    const dispatch = await warehouseService.createDispatch(req.body, req.user._id);
    return sendCreated(res, dispatch, "Dispatch order created successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to create dispatch",
      500
    );
  }
});

export const getDispatches = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const dispatches = await warehouseService.getDispatches(warehouseId as string, filters);
    sendSuccess(res, dispatches, "Dispatches retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get dispatches", 500);
  }
});

export const getDispatchById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Dispatch ID is required");

  try {
    const dispatch = await warehouseService.getDispatchById(id);
    if (!dispatch) return sendNotFound(res, "Dispatch order not found");
    sendSuccess(res, dispatch, "Dispatch order retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get dispatch order", 500);
  }
});

export const updateDispatchStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) return sendBadRequest(res, "Dispatch ID is required");
  if (!status) return sendBadRequest(res, "Dispatch status is required");

  try {
    const dispatch = await warehouseService.updateDispatchStatus(id, status);
    return sendSuccess(res, dispatch, "Dispatch status updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update dispatch status",
      500
    );
  }
});

// QC Templates
export const createQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  try {
    const template = await warehouseService.createQCTemplate(req.body, req.user._id);
    return sendCreated(res, template, "QC template created successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to create QC template",
      500
    );
  }
});

export const getQCTemplates = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { sku } = req.query;
    const templates = await warehouseService.getQCTemplates(sku as string);
    sendSuccess(res, templates, "QC templates retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get QC templates", 500);
  }
});

export const updateQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Template ID is required");

  try {
    const template = await warehouseService.updateQCTemplate(id, req.body);
    if (!template) return sendNotFound(res, "QC template not found");
    return sendSuccess(res, template, "QC template updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update QC template",
      500
    );
  }
});

export const deleteQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Template ID is required");

  try {
    await warehouseService.deleteQCTemplate(id);
    return sendSuccess(res, null, "QC template deleted successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to delete QC template",
      500
    );
  }
});

// Return Management
export const createReturnOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  try {
    const returnOrder = await warehouseService.createReturnOrder(req.body, req.user._id);
    return sendCreated(res, returnOrder, "Return order created successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to create return order",
      500
    );
  }
});

export const getReturnQueue = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const returnQueue = await warehouseService.getReturnQueue(warehouseId as string, filters);
    sendSuccess(res, returnQueue, "Return queue retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get return queue", 500);
  }
});

export const approveReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Return ID is required");

  try {
    const returnOrder = await warehouseService.approveReturn(id);
    return sendSuccess(res, returnOrder, "Return approved successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to approve return", 500);
  }
});

export const rejectReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Return ID is required");

  try {
    const returnOrder = await warehouseService.rejectReturn(id);
    return sendSuccess(res, returnOrder, "Return rejected successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to reject return", 500);
  }
});

// Field Agent Management
export const getFieldAgents = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Only set isActive if the query parameter is explicitly provided
    const isActive =
      req.query["isActive"] !== undefined ? req.query["isActive"] === "true" : undefined;
    const agents = await warehouseService.getFieldAgents(isActive);
    sendSuccess(res, agents, "Field agents retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get field agents", 500);
  }
});

export const createFieldAgent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  try {
    const agent = await warehouseService.createFieldAgent(req.body, req.user._id);
    return sendCreated(res, agent, "Field agent created successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to create field agent",
      500
    );
  }
});

export const updateFieldAgent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  const { id } = req.params;
  if (!id) return sendBadRequest(res, "User ID is required");

  try {
    const agent = await warehouseService.updateFieldAgent(id, req.body);
    return sendSuccess(res, agent, "Field agent updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update field agent",
      500
    );
  }
});

// Screen 4: Inventory Management
export const getInventoryDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const { page = 1, limit = 50, ...filters } = req.query;

  if (!warehouseId) {
    return sendBadRequest(res, "Warehouse ID is required");
  }

  try {
    const result = await warehouseService.getInventoryDashboard(
      warehouseId,
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );
    sendSuccess(res, result, "Inventory dashboard data retrieved successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to get inventory dashboard",
      500
    );
  }
});

export const getInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, "Inventory ID is required");
  }

  try {
    const inventoryItem = await warehouseService.getInventoryById(id);
    if (!inventoryItem) {
      return sendError(res, "Inventory item not found", 404);
    }
    sendSuccess(res, inventoryItem, "Inventory item retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get inventory item", 500);
  }
});

export const updateInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return sendBadRequest(res, "Inventory ID is required");
  }

  try {
    const updatedItem = await warehouseService.updateInventoryItem(id, updateData);
    sendSuccess(res, updatedItem, "Inventory item updated successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to update inventory item", 500);
  }
});

export const archiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, "Inventory ID is required");
  }

  try {
    const archivedItem = await warehouseService.archiveInventoryItem(id);
    sendSuccess(res, archivedItem, "Inventory item archived successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to archive inventory item",
      500
    );
  }
});

export const unarchiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, "Inventory ID is required");
  }

  try {
    const unarchivedItem = await warehouseService.unarchiveInventoryItem(id);
    sendSuccess(res, unarchivedItem, "Inventory item unarchived successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to unarchive inventory item",
      500
    );
  }
});

export const getArchivedInventory = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  if (!warehouseId) {
    return sendBadRequest(res, "Warehouse ID is required");
  }

  try {
    const result = await warehouseService.getArchivedInventory(
      warehouseId,
      parseInt(page as string),
      parseInt(limit as string)
    );
    sendSuccess(res, result, "Archived inventory retrieved successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to get archived inventory",
      500
    );
  }
});

export const getInventoryStats = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  if (!warehouseId) {
    return sendBadRequest(res, "Warehouse ID is required");
  }

  try {
    const stats = await warehouseService.getInventoryStats(warehouseId);
    sendSuccess(res, stats, "Inventory statistics retrieved successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to get inventory statistics",
      500
    );
  }
});

export const bulkArchiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { inventoryIds } = req.body;

  if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
    return sendBadRequest(res, "Inventory IDs array is required");
  }

  try {
    const result = await warehouseService.bulkArchiveInventory(inventoryIds);
    sendSuccess(res, result, result.message);
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to bulk archive inventory",
      500
    );
  }
});

export const bulkUnarchiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { inventoryIds } = req.body;

  if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
    return sendBadRequest(res, "Inventory IDs array is required");
  }

  try {
    const result = await warehouseService.bulkUnarchiveInventory(inventoryIds);
    sendSuccess(res, result, result.message);
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to bulk unarchive inventory",
      500
    );
  }
});

// Screen 5: Expense Management
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  try {
    const expense = await warehouseService.createExpense(req.body, req.user._id);
    return sendCreated(res, expense, "Expense recorded successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to record expense", 500);
  }
});

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const expenses = await warehouseService.getExpenses(warehouseId as string, filters);
    sendSuccess(res, expenses, "Expenses retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get expenses", 500);
  }
});

export const updateExpenseStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) return sendBadRequest(res, "Expense ID is required");
  if (!status) return sendBadRequest(res, "Expense status is required");

  try {
    const expense = await warehouseService.updateExpenseStatus(id, status, req.user?._id);
    return sendSuccess(res, expense, "Expense status updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update expense status",
      500
    );
  }
});

export const updateExpensePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!id) return sendBadRequest(res, "Expense ID is required");
  if (!paymentStatus) return sendBadRequest(res, "Expense payment status is required");

  try {
    const expense = await warehouseService.updateExpensePaymentStatus(id, paymentStatus);
    return sendSuccess(res, expense, "Expense payment status updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update expense payment status",
      500
    );
  }
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Expense ID is required");

  try {
    const expense = await warehouseService.updateExpense(id, req.body);
    return sendSuccess(res, expense, "Expense updated successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to update expense", 500);
  }
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Expense ID is required");

  try {
    await warehouseService.deleteExpense(id);
    return sendSuccess(res, null, "Expense deleted successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to delete expense", 500);
  }
});

export const uploadExpenseBill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) return sendBadRequest(res, "Expense ID is required");

  if (!req.file) {
    return sendBadRequest(res, "No file uploaded");
  }

  try {
    const expense = await warehouseService.uploadExpenseBill(id, req.file);
    return sendSuccess(res, expense, "Bill uploaded successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to upload bill", 500);
  }
});

export const getExpenseById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Expense ID is required");

  try {
    const expense = await warehouseService.getExpenseById(id);
    if (!expense) return sendNotFound(res, "Expense not found");
    return sendSuccess(res, expense, "Expense retrieved successfully");
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : "Failed to get expense", 500);
  }
});

export const getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const summary = await warehouseService.getExpenseSummary(warehouseId as string, filters);
    sendSuccess(res, summary, "Expense summary retrieved successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get expense summary", 500);
  }
});

export const getMonthlyExpenseTrend = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, months = 12 } = req.query;
    const trend = await warehouseService.getMonthlyExpenseTrend(
      warehouseId as string,
      parseInt(months as string)
    );
    sendSuccess(res, trend, "Monthly expense trend retrieved successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to get monthly expense trend",
      500
    );
  }
});

// Screen 6: Reports & Analytics
export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, warehouseId, ...filters } = req.query;

    if (!type) return sendBadRequest(res, "Report type is required");
    if (!warehouseId) return sendBadRequest(res, "warehouseId is required");

    const report = await warehouseService.generateReport(type as string, {
      warehouse: warehouseId as string,
      ...filters,
    });

    sendSuccess(res, report, "Report generated successfully");
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to generate report", 500);
  }
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, format = "csv", warehouseId, ...filters } = req.query;

    if (!type) return sendBadRequest(res, "Report type is required");
    if (!warehouseId) return sendBadRequest(res, "warehouseId is required");

    const report = await warehouseService.exportReport(type as string, format as string, {
      warehouse: warehouseId as string,
      ...filters,
    });

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${type}-report.csv`);
      res.send(report);
    } else {
      sendSuccess(res, report, "Report exported successfully");
    }
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to export report", 500);
  }
});

// Enhanced Reports
export const generateInventorySummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generateReport("inventory_summary", {
      warehouse: warehouseId as string,
      ...filters,
    });
    sendSuccess(res, report, "Inventory summary report generated successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to generate inventory summary report",
      500
    );
  }
});

export const generatePurchaseOrderReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generateReport("purchase_orders", {
      warehouse: warehouseId as string,
      ...filters,
    });
    sendSuccess(res, report, "Purchase order report generated successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to generate purchase order report",
      500
    );
  }
});

export const generateInventoryTurnoverReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generateReport("inventory_turnover", {
      warehouse: warehouseId as string,
      ...filters,
    });
    sendSuccess(res, report, "Inventory turnover report generated successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to generate inventory turnover report",
      500
    );
  }
});

export const generateQCSummaryReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generateReport("qc_summary", {
      warehouse: warehouseId as string,
      ...filters,
    });
    sendSuccess(res, report, "QC summary report generated successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to generate QC summary report",
      500
    );
  }
});

export const generateEfficiencyReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generateReport("efficiency", {
      warehouse: warehouseId as string,
      ...filters,
    });
    sendSuccess(res, report, "Efficiency report generated successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to generate efficiency report",
      500
    );
  }
});

export const getReportTypes = asyncHandler(async (_req: Request, res: Response) => {
  const reportTypes = [
    { value: "inventory_summary", label: "Inventory Summary" },
    { value: "purchase_orders", label: "Purchase Orders from Vendors" },
    { value: "inventory_turnover", label: "Inventory Turnover" },
    { value: "qc_summary", label: "QC Summary" },
    { value: "efficiency", label: "Efficiency Report" },
    { value: "stock_ageing", label: "Stock Ageing" },
  ];

  sendSuccess(res, reportTypes, "Report types retrieved successfully");
});

// Additional utility endpoints
export const getStockAgeingReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.query;
    const report = await warehouseService.generateReport("stock_ageing", {
      warehouse: warehouseId as string,
    });
    sendSuccess(res, report, "Stock ageing report generated successfully");
  } catch (error) {
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to generate stock ageing report",
      500
    );
  }
});

// ==================== WAREHOUSE MANAGEMENT CONTROLLERS ====================
export const createWarehouse = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check if user is super admin
  const isSuperAdmin = req.user.roles?.some((role: any) => role.systemRole === "super_admin");
  if (!isSuperAdmin) {
    return sendError(res, "Only Super Admin can create warehouses", 403);
  }

  try {
    const warehouse = await warehouseService.createWarehouse(req.body, req.user._id);
    return sendCreated(res, warehouse, "Warehouse created successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to create warehouse",
      500
    );
  }
});

export const getWarehouses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for viewing warehouses
  if (!checkPermission(req.user, "warehouse:view")) {
    return sendError(res, "Insufficient permissions to view warehouses", 403);
  }

  try {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string,
      isActive:
        req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
      partner: req.query.partner as string,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    const result = await warehouseService.getWarehouses(filters, req.user._id, req.user.roles);
    return sendSuccess(res, result, "Warehouses retrieved successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to retrieve warehouses",
      500
    );
  }
});

export const getWarehouseById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for viewing warehouses
  if (!checkPermission(req.user, "warehouse:view")) {
    return sendError(res, "Insufficient permissions to view warehouse", 403);
  }

  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Warehouse ID is required");

  try {
    const warehouse = await warehouseService.getWarehouseById(id, req.user._id, req.user.roles);
    return sendSuccess(res, warehouse, "Warehouse retrieved successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to retrieve warehouse",
      500
    );
  }
});

export const updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check permission for managing warehouses
  if (!checkPermission(req.user, "warehouse:manage")) {
    return sendError(res, "Insufficient permissions to update warehouse", 403);
  }

  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Warehouse ID is required");

  try {
    const warehouse = await warehouseService.updateWarehouse(id, req.body);
    return sendSuccess(res, warehouse, "Warehouse updated successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to update warehouse",
      500
    );
  }
});

export const deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Check if user is super admin
  const isSuperAdmin = req.user.roles?.some((role: any) => role.systemRole === "super_admin");
  if (!isSuperAdmin) {
    return sendError(res, "Only Super Admin can delete warehouses", 403);
  }

  const { id } = req.params;
  if (!id) return sendBadRequest(res, "Warehouse ID is required");

  try {
    await warehouseService.deleteWarehouse(id);
    return sendSuccess(res, null, "Warehouse deleted successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to delete warehouse",
      500
    );
  }
});

// Get warehouse assigned to logged-in manager (for warehouse managers to know their warehouse)
export const getMyWarehouse = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  try {
    // Check if user is super admin
    const isSuperAdmin = req.user.roles?.some((role: any) => role.systemRole === "super_admin");

    // Get user's permissions
    const permissions = await req.user.getPermissions();

    // Super admin has access to all warehouses, not a specific assigned warehouse
    if (isSuperAdmin) {
      const warehousesResult = await warehouseService.getWarehouses(
        { isActive: true },
        req.user._id,
        req.user.roles
      );

      const responseData = {
        warehouse: null, // Super admin doesn't have a single assigned warehouse
        warehouses: warehousesResult.warehouses, // Return all warehouses for super admin
        pagination: warehousesResult.pagination,
        manager: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          roles: req.user.roles?.map((role: any) => ({
            id: role._id || role.id,
            name: role.name,
            key: role.key,
            systemRole: role.systemRole,
          })),
          permissions: permissions,
        },
        isSuperAdmin: true,
      };

      return sendSuccess(
        res,
        responseData,
        "All warehouses retrieved successfully for Super Admin"
      );
    }

    // For warehouse managers and staff, get their assigned warehouse
    const warehouse = await warehouseService.getMyWarehouse(req.user._id);

    // Include permissions in the response
    const responseData = {
      warehouse,
      manager: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        roles: req.user.roles?.map((role: any) => ({
          id: role._id || role.id,
          name: role.name,
          key: role.key,
          systemRole: role.systemRole,
        })),
        permissions: permissions,
      },
      isSuperAdmin: false,
    };

    return sendSuccess(res, responseData, "Your assigned warehouse retrieved successfully");
  } catch (error) {
    return sendError(
      res,
      error instanceof Error ? error.message : "Failed to retrieve assigned warehouse",
      500
    );
  }
});
