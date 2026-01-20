import { Response } from "express";
import { HTTP_STATUS } from "../config/constants";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = "Success",
  statusCode = HTTP_STATUS.OK
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendCreated = <T>(
  res: Response,
  data?: T,
  message = "Created successfully"
): Response<ApiResponse<T>> => {
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  errors?: any
): Response<ApiResponse> => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors || null,
  });
};

export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message = "Success"
): Response<ApiResponse<T[]>> => {
  const pages = Math.ceil(total / limit);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  });
};

export const sendNotFound = (
  res: Response,
  message = "Resource not found"
): Response<ApiResponse> => {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message,
  });
};

export const sendUnauthorized = (
  res: Response,
  message = "Unauthorized access"
): Response<ApiResponse> => {
  return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    success: false,
    message,
  });
};

export const sendForbidden = (
  res: Response,
  message = "Access forbidden"
): Response<ApiResponse> => {
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message,
  });
};

export const sendValidationError = (
  res: Response,
  errors: any,
  message = "Validation failed"
): Response<ApiResponse> => {
  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
    success: false,
    message,
    errors,
  });
};

export const sendConflict = (
  res: Response,
  message = "Resource already exists"
): Response<ApiResponse> => {
  return res.status(HTTP_STATUS.CONFLICT).json({
    success: false,
    message,
  });
};

export const sendInternalError = (
  res: Response,
  message = "Internal server error"
): Response<ApiResponse> => {
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message,
  });
};
