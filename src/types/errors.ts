/**
 * Error types for the Pollos Sales application
 */

export enum ErrorType {
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  SERVER = "SERVER",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  UNKNOWN = "UNKNOWN",
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  details?: unknown;
}

/**
 * Parse an error from an API call into a structured AppError
 */
export function parseError(error: unknown): AppError {
  // Network errors (fetch failed, no connection)
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: ErrorType.NETWORK,
      message: error.message,
      userMessage: "No se pudo conectar al servidor. Verifica tu conexión a internet.",
      retryable: true,
    };
  }

  // Standard Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Auth errors
    if (message.includes("unauthorized") || message.includes("401")) {
      return {
        type: ErrorType.AUTH,
        message: error.message,
        userMessage: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
        retryable: false,
        statusCode: 401,
      };
    }

    // Not found errors
    if (message.includes("not found") || message.includes("404")) {
      return {
        type: ErrorType.NOT_FOUND,
        message: error.message,
        userMessage: "No se encontró el recurso solicitado.",
        retryable: false,
        statusCode: 404,
      };
    }

    // Server errors
    if (message.includes("500") || message.includes("server error")) {
      return {
        type: ErrorType.SERVER,
        message: error.message,
        userMessage: "Error del servidor. Por favor intenta nuevamente en unos momentos.",
        retryable: true,
        statusCode: 500,
      };
    }

    // Validation errors
    if (message.includes("validation") || message.includes("400")) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        userMessage: "Los datos enviados no son válidos. Por favor verifica e intenta nuevamente.",
        retryable: false,
        statusCode: 400,
      };
    }

    // Generic error
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      userMessage: error.message || "Ocurrió un error inesperado.",
      retryable: true,
    };
  }

  // Unknown error type
  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
    userMessage: "Ocurrió un error inesperado.",
    retryable: true,
  };
}

/**
 * Get an appropriate icon for an error type
 */
export function getErrorIcon(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return "📡";
    case ErrorType.AUTH:
      return "🔒";
    case ErrorType.SERVER:
      return "⚠️";
    case ErrorType.VALIDATION:
      return "❌";
    case ErrorType.NOT_FOUND:
      return "🔍";
    default:
      return "❌";
  }
}
