// utils/responseHandlers.ts
import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date(),
  };
  res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = "Resource created successfully"
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date(),
  };
  res.status(201).json(response);
};

export const sendError = (res: Response, error: string, statusCode: number = 500): void => {
  const response: ApiResponse = {
    success: false,
    message: "Error occurred",
    error,
    timestamp: new Date(),
  };
  res.status(statusCode).json(response);
};

export const sendNotFound = (res: Response, message: string = "Resource not found"): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: "Not Found",
    timestamp: new Date(),
  };
  res.status(404).json(response);
};

export const sendBadRequest = (res: Response, error: string = "Bad request"): void => {
  const response: ApiResponse = {
    success: false,
    message: "Validation error",
    error,
    timestamp: new Date(),
  };
  res.status(400).json(response);
};

export const sendUnauthorized = (res: Response, message: string = "Unauthorized"): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: "Authentication required",
    timestamp: new Date(),
  };
  res.status(401).json(response);
};

export const sendForbidden = (res: Response, message: string = "Forbidden"): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: "Insufficient permissions",
    timestamp: new Date(),
  };
  res.status(403).json(response);
};
