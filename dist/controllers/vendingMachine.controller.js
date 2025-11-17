"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProductAcrossMachines = exports.checkProductAvailability = exports.getMachineStats = exports.getLocationFilters = exports.getVendingMachinesByLocation = exports.getVendingMachineProducts = exports.getVendingMachineByMachineId = exports.getVendingMachineById = exports.getAllVendingMachines = void 0;
const vendingMachine_service_1 = require("../services/vendingMachine.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.getAllVendingMachines = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { city, state, status, isOnline, search } = req.query;
        const query = {
            city: city,
            state: state,
            status: status,
            isOnline: isOnline === 'true' ? true : isOnline === 'false' ? false : undefined,
            search: search
        };
        const machines = await vendingMachine_service_1.vendingMachineService.getAllVendingMachines(query);
        return (0, response_util_1.sendSuccess)(res, {
            machines,
            total: machines.length
        }, 'Vending machines retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve vending machines', 500);
        }
    }
});
exports.getVendingMachineById = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const machine = await vendingMachine_service_1.vendingMachineService.getVendingMachineById(id);
        return (0, response_util_1.sendSuccess)(res, machine, 'Vending machine retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve vending machine', 500);
        }
    }
});
exports.getVendingMachineByMachineId = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId } = req.params;
        const machine = await vendingMachine_service_1.vendingMachineService.getVendingMachineByMachineId(machineId);
        return (0, response_util_1.sendSuccess)(res, machine, 'Vending machine retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve vending machine', 500);
        }
    }
});
exports.getVendingMachineProducts = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId } = req.params;
        const result = await vendingMachine_service_1.vendingMachineService.getVendingMachineProducts(machineId);
        return (0, response_util_1.sendSuccess)(res, result, 'Machine products retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve machine products', 500);
        }
    }
});
exports.getVendingMachinesByLocation = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { city, state } = req.query;
        const machines = await vendingMachine_service_1.vendingMachineService.getVendingMachinesByLocation(city, state);
        return (0, response_util_1.sendSuccess)(res, {
            machines,
            total: machines.length,
            filters: { city, state }
        }, 'Vending machines by location retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve vending machines by location', 500);
        }
    }
});
exports.getLocationFilters = (0, asyncHandler_util_1.asyncHandler)(async (_req, res) => {
    try {
        const filters = await vendingMachine_service_1.vendingMachineService.getLocationFilters();
        return (0, response_util_1.sendSuccess)(res, filters, 'Location filters retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve location filters', 500);
        }
    }
});
exports.getMachineStats = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId } = req.params;
        const stats = await vendingMachine_service_1.vendingMachineService.getMachineStats(machineId);
        return (0, response_util_1.sendSuccess)(res, stats, 'Machine stats retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve machine stats', 500);
        }
    }
});
exports.checkProductAvailability = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId, slotNumber } = req.params;
        const availability = await vendingMachine_service_1.vendingMachineService.checkProductAvailability(machineId, slotNumber);
        return (0, response_util_1.sendSuccess)(res, availability, 'Product availability checked successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to check product availability', 500);
        }
    }
});
exports.searchProductAcrossMachines = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { search, currentMachine } = req.query;
        if (!search || typeof search !== 'string') {
            return (0, response_util_1.sendError)(res, 'Search term is required', 400);
        }
        const results = await vendingMachine_service_1.vendingMachineService.searchProductAcrossMachines(search, currentMachine);
        return (0, response_util_1.sendSuccess)(res, results, 'Product search completed successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to search products across machines', 500);
        }
    }
});
//# sourceMappingURL=vendingMachine.controller.js.map