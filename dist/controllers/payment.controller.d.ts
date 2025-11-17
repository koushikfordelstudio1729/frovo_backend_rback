import { Request, Response } from 'express';
export declare const initiatePayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserPayments: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const processPaymentWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const confirmPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const processRefund: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserPaymentStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getMachinePaymentStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const mockPaymentSuccess: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const mockPaymentFailure: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=payment.controller.d.ts.map