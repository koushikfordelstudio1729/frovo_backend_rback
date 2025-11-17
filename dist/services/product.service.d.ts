import { Types } from 'mongoose';
export interface ProductQuery {
    category?: string;
    brand?: string;
    isActive?: boolean | undefined;
    search?: string;
}
declare class ProductService {
    getProductById(id: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Product.model").IProduct, {}, {}> & import("../models/Product.model").IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getAllProducts(query?: ProductQuery): Promise<(import("mongoose").Document<unknown, {}, import("../models/Product.model").IProduct, {}, {}> & import("../models/Product.model").IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getProductsByCategory(category: string): Promise<(import("mongoose").Document<unknown, {}, import("../models/Product.model").IProduct, {}, {}> & import("../models/Product.model").IProduct & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    getProductCategories(): Promise<any[]>;
    getProductAvailabilityAcrossMachines(productId: string): Promise<{
        productId: string;
        totalMachines: number;
        totalQuantity: any;
        availability: any[];
    }>;
}
export declare const productService: ProductService;
export {};
//# sourceMappingURL=product.service.d.ts.map