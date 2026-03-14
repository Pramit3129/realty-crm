/**
 * Structured logger compatible with Google Cloud Logging.
 *
 * Outputs JSON objects with `severity`, `message`, `timestamp`, and optional context fields.
 * Cloud Logging automatically parses these when running on Cloud Run.
 */

type LogLevel = "INFO" | "WARNING" | "ERROR" | "DEBUG";

interface LogEntry {
    severity: LogLevel;
    message: string;
    timestamp: string;
    [key: string]: unknown;
}

function log(severity: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
        severity,
        message,
        timestamp: new Date().toISOString(),
        ...context,
    };

    switch (severity) {
        case "ERROR":
            console.error(JSON.stringify(entry));
            break;
        case "WARNING":
            console.warn(JSON.stringify(entry));
            break;
        default:
            console.log(JSON.stringify(entry));
    }
}

export const logger = {
    info: (message: string, context?: Record<string, unknown>) => log("INFO", message, context),
    warn: (message: string, context?: Record<string, unknown>) => log("WARNING", message, context),
    error: (message: string, context?: Record<string, unknown>) => log("ERROR", message, context),
    debug: (message: string, context?: Record<string, unknown>) => log("DEBUG", message, context),
};
