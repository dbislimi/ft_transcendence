const isDev = import.meta.env?.DEV ?? true;
const isProduction = import.meta.env?.PROD ?? false;

interface LogContext {
  [key: string]: any;
}

class Logger {
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    if (isProduction) {
      return level === 'error' || level === 'warn';
    }
    // Disable debug logs by default to reduce noise
    if (level === 'debug') return false;
    return true;
  }

  private formatMessage(message: string, context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return message;
    try {
      return `${message} ${JSON.stringify(context)}`;
    } catch {
      return message;
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${this.formatMessage(message, context)}`);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${this.formatMessage(message, context)}`);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${this.formatMessage(message, context)}`);
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      console.error(`[ERROR] ${this.formatMessage(message, errorContext)}`);
    }
  }
}

export const logger = new Logger();

