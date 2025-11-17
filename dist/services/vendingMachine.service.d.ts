import { Types } from 'mongoose';
export interface VendingMachineQuery {
    city?: string;
    state?: string;
    status?: string;
    isOnline?: boolean | undefined;
    search?: string;
}
declare class VendingMachineService {
    getAllVendingMachines(query?: VendingMachineQuery): Promise<(import("mongoose").Document<unknown, {}, import("../models/VendingMachine.model").IVendingMachine, {}, {}> & import("../models/VendingMachine.model").IVendingMachine & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getVendingMachineById(id: string): Promise<import("mongoose").Document<unknown, {}, import("../models/VendingMachine.model").IVendingMachine, {}, {}> & import("../models/VendingMachine.model").IVendingMachine & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getVendingMachineByMachineId(machineId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/VendingMachine.model").IVendingMachine, {}, {}> & import("../models/VendingMachine.model").IVendingMachine & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getVendingMachineProducts(machineId: string): Promise<{
        machineId: string;
        machineName: string;
        location: import("../models/VendingMachine.model").ILocation;
        products: {
            slotNumber: string;
            product: Types.ObjectId;
            quantity: number;
            price: number;
            availability: string;
        }[];
    }>;
    getVendingMachinesByLocation(city?: string | undefined, state?: string | undefined): Promise<(import("mongoose").Document<unknown, {}, import("../models/VendingMachine.model").IVendingMachine, {}, {}> & import("../models/VendingMachine.model").IVendingMachine & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getLocationFilters(): Promise<{
        cities: any;
        states: any;
    }>;
    getMachineStats(machineId: string): Promise<{
        machineId: string;
        name: string;
        status: "Maintenance" | "Active" | "Inactive" | "Out of Service";
        isOnline: boolean;
        totalProducts: number;
        availableProducts: number;
        outOfStockSlots: number;
        totalStock: number;
        revenue: number | undefined;
        totalSales: number | undefined;
        lastMaintenanceDate: Date | undefined;
        location: import("../models/VendingMachine.model").ILocation;
    }>;
    checkProductAvailability(machineId: string, slotNumber: string): Promise<{
        slotNumber: string;
        product: Types.ObjectId;
        quantity: number;
        price: number;
        isAvailable: boolean;
    }>;
    searchProductAcrossMachines(productSearchTerm: string, currentMachineId?: string): Promise<{
        searchTerm: string;
        currentMachine: string | null;
        productsFound: never[];
        alternativeMachines: never[];
        totalMachinesWithProduct?: never;
        totalAlternatives?: never;
    } | {
        searchTerm: string;
        currentMachine: {
            machineId: string;
            machineName: string;
            location: import("../models/VendingMachine.model").ILocation;
            isCurrentMachine: boolean;
            availableProducts: {
                slotNumber: string;
                product: Types.ObjectId;
                quantity: number;
                price: number;
            }[];
        } | null;
        productsFound: (import("mongoose").Document<unknown, {}, import("../models/Product.model").IProduct, {}, {}> & import("../models/Product.model").IProduct & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        alternativeMachines: {
            machineId: string;
            machineName: string;
            location: import("../models/VendingMachine.model").ILocation;
            isCurrentMachine: boolean;
            availableProducts: {
                slotNumber: string;
                product: Types.ObjectId;
                quantity: number;
                price: number;
            }[];
        }[];
        totalMachinesWithProduct: number;
        totalAlternatives: number;
    }>;
}
export declare const vendingMachineService: VendingMachineService;
export {};
//# sourceMappingURL=vendingMachine.service.d.ts.map