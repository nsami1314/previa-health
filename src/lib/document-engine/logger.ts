/**
 * Previa Health
 * Document Engine
 * Logger
 */

export class DocumentEngineLogger {
    static info(message: string, ...args: unknown[]): void {
      console.info(`[DocumentEngine] ${message}`, ...args);
    }
  
    static warn(message: string, ...args: unknown[]): void {
      console.warn(`[DocumentEngine] ${message}`, ...args);
    }
  
    static error(message: string, ...args: unknown[]): void {
      console.error(`[DocumentEngine] ${message}`, ...args);
    }
  
    static debug(message: string, ...args: unknown[]): void {
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[DocumentEngine] ${message}`, ...args);
      }
    }
  }