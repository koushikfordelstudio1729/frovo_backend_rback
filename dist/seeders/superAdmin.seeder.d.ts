import { Types } from "mongoose";
export declare const seedSuperAdmin: (departmentMap: {
    [key: string]: Types.ObjectId;
}, roleMap: {
    [key: string]: Types.ObjectId;
}) => Promise<{
    superAdminId: Types.ObjectId;
    vendorAdminId: Types.ObjectId;
}>;
//# sourceMappingURL=superAdmin.seeder.d.ts.map