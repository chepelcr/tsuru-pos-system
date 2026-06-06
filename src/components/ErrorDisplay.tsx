import { parseError, getErrorIcon, ErrorType } from "@/types/errors";

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * Reusable error display component with retry functionality
 */
export default function ErrorDisplay({ error, onRetry, className = "" }: ErrorDisplayProps) {
  const appError = parseError(error);
  const icon = getErrorIcon(appError.type);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">{icon}</div>
        <div className="text-destructive font-barlow font-bold text-xl mb-2">
          {appError.type === ErrorType.NETWORK && "Error de Conexión"}
          {appError.type === ErrorType.AUTH && "Sesión Expirada"}
          {appError.type === ErrorType.SERVER && "Error del Servidor"}
          {appError.type === ErrorType.VALIDATION && "Datos Inválidos"}
          {appError.type === ErrorType.NOT_FOUND && "No Encontrado"}
          {appError.type === ErrorType.UNKNOWN && "Error Inesperado"}
        </div>
        <div className="text-muted text-sm mb-4">
          {appError.userMessage}
        </div>
        {appError.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-barlow font-bold hover:bg-primary-dark transition-colors"
          >
            ↻ Reintentar
          </button>
        )}
        {appError.type === ErrorType.AUTH && (
          <button
            onClick={() => window.location.href = "/login"}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-barlow font-bold hover:bg-primary-dark transition-colors"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </div>
  );
}
