"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "error";
    LogLevel["WARN"] = "warn";
    LogLevel["INFO"] = "info";
    LogLevel["DEBUG"] = "debug";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.isDevelopment = process.env["NODE_ENV"] === "development";
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        if (meta && this.isDevelopment) {
            return `${baseMessage} ${JSON.stringify(meta, null, 2)}`;
        }
        return baseMessage;
    }
    info(message, meta) {
        console.log(this.formatMessage(LogLevel.INFO, message, meta));
    }
    error(message, meta) {
        console.error(this.formatMessage(LogLevel.ERROR, message, meta));
    }
    warn(message, meta) {
        console.warn(this.formatMessage(LogLevel.WARN, message, meta));
    }
    debug(message, meta) {
        if (this.isDevelopment) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
        }
    }
    audit(action, actor, target, meta) {
        const auditMessage = `AUDIT: ${actor} performed ${action} on ${target}`;
        this.info(auditMessage, meta);
    }
}
exports.logger = new Logger();
