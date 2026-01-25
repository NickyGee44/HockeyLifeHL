/**
 * Logging Utility
 *
 * Provides structured logging with different levels and sanitization.
 * In production, logs are sanitized to prevent information leakage.
 * Can be integrated with external logging services (Sentry, LogRocket, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Sanitize sensitive data from logs
 * Removes passwords, tokens, API keys, etc.
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    // Don't log long strings that might be tokens
    if (data.length > 100) {
      return `[REDACTED: ${data.length} chars]`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Redact sensitive fields
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('session')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (key === 'error' && value instanceof Error) {
        // For Error objects, only include message in production
        sanitized[key] = isProduction
          ? { message: value.message }
          : { message: value.message, stack: value.stack };
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Format log message with timestamp and context
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);

  if (!context || Object.keys(context).length === 0) {
    return `[${timestamp}] ${levelUpper} ${message}`;
  }

  const contextStr = JSON.stringify(isProduction ? sanitizeData(context) : context);
  return `[${timestamp}] ${levelUpper} ${message} ${contextStr}`;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private context?: LogContext;

  constructor(context?: LogContext) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!isDevelopment) return;

    const fullContext = { ...this.context, ...context };
    console.debug(formatLog('debug', message, fullContext));
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    const fullContext = { ...this.context, ...context };
    console.info(formatLog('info', message, fullContext));

    // TODO: Send to external logging service
    // await sendToLoggingService('info', message, fullContext);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    const fullContext = { ...this.context, ...context };
    console.warn(formatLog('warn', message, fullContext));

    // TODO: Send to external logging service
    // await sendToLoggingService('warn', message, fullContext);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const fullContext = {
      ...this.context,
      ...context,
      error: error instanceof Error ? error : { message: String(error) },
    };

    const sanitized = isProduction ? sanitizeData(fullContext) : fullContext;
    console.error(formatLog('error', message, sanitized));

    // TODO: Send to error tracking service (e.g., Sentry)
    // if (isProduction && error instanceof Error) {
    //   Sentry.captureException(error, {
    //     extra: sanitized,
    //   });
    // }
  }

  /**
   * Log authentication events
   */
  auth(event: string, context?: LogContext): void {
    this.info(`[AUTH] ${event}`, context);
  }

  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    // Security events are always logged, even in production
    const fullContext = { ...this.context, ...context };
    console.warn(formatLog('warn', `[SECURITY] ${event}`, fullContext));

    // TODO: Send to security monitoring service
    // await sendSecurityAlert(event, fullContext);
  }
}

// Default logger instance
export const logger = new Logger();

// Specialized loggers for different modules
export const authLogger = logger.child({ module: 'auth' });
export const apiLogger = logger.child({ module: 'api' });
export const emailLogger = logger.child({ module: 'email' });

export default logger;
