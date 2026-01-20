import { Request, Response } from "express";
import { vendingMachineService } from "../services/vendingMachine.service";
import { asyncHandler } from "../utils/asyncHandler.util";
import { sendSuccess, sendError } from "../utils/response.util";

export const getAllVendingMachines = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { city, state, status, isOnline, search } = req.query;

    const query = {
      city: city as string,
      state: state as string,
      status: status as string,
      isOnline: isOnline === "true" ? true : isOnline === "false" ? false : undefined,
      search: search as string,
    };

    const machines = await vendingMachineService.getAllVendingMachines(query);

    return sendSuccess(
      res,
      {
        machines,
        total: machines.length,
      },
      "Vending machines retrieved successfully"
    );
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to retrieve vending machines", 500);
    }
  }
});

export const getVendingMachineById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const machine = await vendingMachineService.getVendingMachineById(id!);

    return sendSuccess(res, machine, "Vending machine retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes("not found") ? 404 : 400);
    } else {
      return sendError(res, "Failed to retrieve vending machine", 500);
    }
  }
});

export const getVendingMachineByMachineId = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const machine = await vendingMachineService.getVendingMachineByMachineId(machineId!);

    return sendSuccess(res, machine, "Vending machine retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes("not found") ? 404 : 400);
    } else {
      return sendError(res, "Failed to retrieve vending machine", 500);
    }
  }
});

export const getVendingMachineProducts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const result = await vendingMachineService.getVendingMachineProducts(machineId!);

    return sendSuccess(res, result, "Machine products retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes("not found") ? 404 : 400);
    } else {
      return sendError(res, "Failed to retrieve machine products", 500);
    }
  }
});

export const getVendingMachinesByLocation = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { city, state } = req.query;
    const machines = await vendingMachineService.getVendingMachinesByLocation(
      city as string,
      state as string
    );

    return sendSuccess(
      res,
      {
        machines,
        total: machines.length,
        filters: { city, state },
      },
      "Vending machines by location retrieved successfully"
    );
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to retrieve vending machines by location", 500);
    }
  }
});

export const getLocationFilters = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const filters = await vendingMachineService.getLocationFilters();

    return sendSuccess(res, filters, "Location filters retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to retrieve location filters", 500);
    }
  }
});

export const getMachineStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const stats = await vendingMachineService.getMachineStats(machineId!);

    return sendSuccess(res, stats, "Machine stats retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes("not found") ? 404 : 400);
    } else {
      return sendError(res, "Failed to retrieve machine stats", 500);
    }
  }
});

export const checkProductAvailability = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId, slotNumber } = req.params;
    const availability = await vendingMachineService.checkProductAvailability(
      machineId!,
      slotNumber!
    );

    return sendSuccess(res, availability, "Product availability checked successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes("not found") ? 404 : 400);
    } else {
      return sendError(res, "Failed to check product availability", 500);
    }
  }
});

export const searchProductAcrossMachines = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { search, currentMachine } = req.query;

    if (!search || typeof search !== "string") {
      return sendError(res, "Search term is required", 400);
    }

    const results = await vendingMachineService.searchProductAcrossMachines(
      search,
      currentMachine as string
    );

    return sendSuccess(res, results, "Product search completed successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to search products across machines", 500);
    }
  }
});
