"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateRange = exports.validateSearch = exports.validatePagination = exports.validateObjectId = exports.commonSchemas = exports.validate = void 0;
const zod_1 = require("zod");
const response_util_1 = require("../utils/response.util");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const validate = (schemas) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join("."),
                    message: err.message,
                    code: err.code,
                }));
                return (0, response_util_1.sendValidationError)(res, formattedErrors);
            }
            return next(error);
        }
    });
};
exports.validate = validate;
exports.commonSchemas = {
    objectId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format"),
    pagination: zod_1.z.object({
        page: zod_1.z
            .string()
            .optional()
            .transform(val => (val ? parseInt(val, 10) : 1)),
        limit: zod_1.z
            .string()
            .optional()
            .transform(val => (val ? parseInt(val, 10) : 10)),
    }),
    search: zod_1.z.object({
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
    }),
    dateRange: zod_1.z.object({
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
    }),
};
const validateObjectId = (field = "id") => {
    return (0, exports.validate)({
        params: zod_1.z.object({
            [field]: exports.commonSchemas.objectId,
        }),
    });
};
exports.validateObjectId = validateObjectId;
const validatePagination = () => {
    return (0, exports.validate)({
        query: exports.commonSchemas.pagination,
    });
};
exports.validatePagination = validatePagination;
const validateSearch = () => {
    return (0, exports.validate)({
        query: exports.commonSchemas.search,
    });
};
exports.validateSearch = validateSearch;
const validateDateRange = () => {
    return (0, exports.validate)({
        query: exports.commonSchemas.dateRange,
    });
};
exports.validateDateRange = validateDateRange;
