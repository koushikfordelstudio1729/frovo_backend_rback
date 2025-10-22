export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

class Logger {
  private isDevelopment = process.env['NODE_ENV'] === 'development';

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (meta && this.isDevelopment) {
      return `${baseMessage} ${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseMessage;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  error(message: string, meta?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  debug(message: string, meta?: any): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }

  audit(action: string, actor: string, target: string, meta?: any): void {
    const auditMessage = `AUDIT: ${actor} performed ${action} on ${target}`;
    this.info(auditMessage, meta);
  }
}

export const logger = new Logger();