import { z } from "zod";

export const verifyMachineSchema = z.object({
  body: z
    .object({
      machineId: z.string().optional(),
      qrCode: z.string().optional(),
    })
    .refine(data => data.machineId || data.qrCode, {
      message: "Either machineId or qrCode must be provided",
    }),
});

export const markPickupCollectedSchema = z.object({
  body: z.object({
    collectedAt: z.string().datetime().or(z.date()).optional(),
    verificationCode: z.string().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const createHandoverSchema = z.object({
  body: z.object({
    dispatchId: z.string().min(1, "Dispatch ID is required"),
    warehouseId: z.string().min(1, "Warehouse ID is required"),
    machineId: z.string().optional(),
    date: z.string().datetime().or(z.date()).optional(),
    agentName: z.string().min(1, "Agent name is required"),
    code: z.string().optional(),
    grade: z.string().optional(),
    category: z.string().optional(),
    reason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
    images: z.array(z.string()).default([]),
  }),
});

export const submitRefillSchema = z.object({
  body: z.object({
    refillData: z
      .array(
        z.object({
          slotId: z.string().min(1),
          productCode: z.string().min(1),
          productName: z.string().optional(),
          transUnitsDispensed: z.number().min(0).default(0),
          existingQty: z.number().min(0).default(0),
          totalUnitsRefilled: z.number().min(0).default(0),
          currentStock: z.number().min(0).default(0),
          variance: z.number().optional(),
          varianceReason: z.string().max(200).optional(),
          removedQty: z.number().min(0).optional(),
          removedReason: z.enum(["Damaged", "Expired", "Missing", "Other", ""]).optional(),
          expiryDate: z.string().datetime().or(z.date()).optional(),
          batchNumber: z.string().optional(),
        })
      )
      .min(1, "At least one slot refill is required"),
    beforePhoto: z.string().url().optional(),
    afterPhoto: z.string().url().optional(),
    additionalPhotos: z.array(z.string().url()).optional(),
    completedAt: z.string().datetime().or(z.date()).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const skipMachineSchema = z.object({
  body: z.object({
    routeId: z.string().optional(),
    reason: z.enum(["Reception Closed", "No Access", "Machine Not Found", "Power Off", "Other"], {
      errorMap: () => ({ message: "Invalid skip reason" }),
    }),
    notes: z.string().max(500).optional(),
    photos: z.array(z.string().url()).optional(),
  }),
});

export const raiseIssueSchema = z.object({
  body: z.object({
    issueType: z.enum(
      [
        "Offline Machine",
        "Jammed Slot",
        "Payment Errors",
        "Temperature",
        "Temp Abnormal",
        "Door Not Locking",
        "Vandalism",
        "Others",
      ],
      {
        errorMap: () => ({ message: "Invalid issue type" }),
      }
    ),
    machineName: z.string().optional(),
    dateTime: z.string().datetime().or(z.date()).optional(),
    lastVisit: z.string().datetime().or(z.date()).optional(),
    description: z.string().min(10, "Description must be at least 10 characters").max(2000),
    affectedSlots: z.array(z.string()).optional(),
    photos: z.array(z.string().url()).default([]),
    officialNote: z.string().max(1000).optional(),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
  }),
});

export const workSummaryQuerySchema = z.object({
  query: z.object({
    date: z.string().optional(),
    reportType: z
      .enum(["pickup", "refill", "maintenance", "daily", "weekly", "monthly"])
      .optional(),
  }),
});

export const getTasksQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(["all", "pending", "in_progress", "completed", "skipped", "cancelled"])
      .optional(),
    type: z.enum(["all", "warehouse_pickup", "machine_refill", "maintenance"]).optional(),
    date: z.string().optional(),
  }),
});

export const getNotificationsQuerySchema = z.object({
  query: z.object({
    read: z.enum(["true", "false"]).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z
      .string()
      .regex(/^[+]?[\d\s-()]+$/)
      .optional(),
    email: z.string().email().optional(),
  }),
});
