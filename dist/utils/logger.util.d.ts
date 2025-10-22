export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    DEBUG = "debug"
}
declare class Logger {
    private isDevelopment;
    private formatMessage;
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    audit(action: string, actor: string, target: string, meta?: any): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.util.d.ts.map