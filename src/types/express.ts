import { IUser } from "../models";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      clientIp?: string;
      userAgent?: string;
    }
  }
}

export {};
