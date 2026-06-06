# Error Handling Implementation for DashboardPage

## Overview

This document describes the comprehensive error handling implementation for the DashboardPage component in the Pollos Sales application.

## Changes Made

### 1. Error Type System (`src/types/errors.ts`)

Created a robust error type system that categorizes errors into:

- **NETWORK**: Connection failures, fetch errors
- **AUTH**: Authentication/authorization failures (401, 403)
- **SERVER**: Server-side errors (500)
- **VALIDATION**: Invalid data errors (400)
- **NOT_FOUND**: Resource not found (404)
- **UNKNOWN**: Uncategorized errors

Each error type includes:
- `type`: Error category
- `message`: Technical error message
- `userMessage`: User-friendly Spanish message
- `retryable`: Whether the error can be retried
- `statusCode`: HTTP status code (if applicable)
- `details`: Additional error details

### 2. Error Display Component (`src/components/ErrorDisplay.tsx`)

Created a reusable error display component that:
- Parses errors using the error type system
- Shows appropriate icons for each error type
- Displays user-friendly messages in Spanish
- Provides retry functionality for retryable errors
- Handles authentication errors with redirect to login

### 3. Enhanced API Client (`src/lib/api.ts`)

Improved the API client to:
- Catch and wrap network errors with descriptive messages
- Include status codes in error objects
- Preserve error details from API responses
- Handle various error response formats
- Provide better error context for debugging

### 4. DashboardPage Error Handling (`src/pages/dashboard/DashboardPage.tsx`)

Enhanced the DashboardPage with:

#### Dashboard Data Query
- Automatic retry with exponential backoff (3 retries)
- Retry delays: 1s, 2s, 4s (capped at 30s)
- Error state display using ErrorDisplay component
- Retry button functionality
- Loading state during refetch

#### Closings Query
- Automatic retry (2 retries with 1s delay)
- Independent error handling from dashboard data
- Error display in closings tab
- Retry functionality specific to closings

#### Approve/Reject Actions
- Try-catch error handling
- User-friendly alert messages
- Automatic refetch on success
- Error logging for debugging

#### Refresh Button
- Shows loading state ("⟳ Actualizando...")
- Disabled during refresh
- Visual feedback for user

## Error Scenarios Handled

### 1. Network Errors
- **Trigger**: No internet connection, DNS failure, server unreachable
- **Display**: 📡 "Error de Conexión"
- **Message**: "No se pudo conectar al servidor. Verifica tu conexión a internet."
- **Action**: Retry button available

### 2. Authentication Errors
- **Trigger**: Expired token, invalid credentials
- **Display**: 🔒 "Sesión Expirada"
- **Message**: "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
- **Action**: Redirect to login page

### 3. Server Errors
- **Trigger**: 500 Internal Server Error
- **Display**: ⚠️ "Error del Servidor"
- **Message**: "Error del servidor. Por favor intenta nuevamente en unos momentos."
- **Action**: Retry button available

### 4. Validation Errors
- **Trigger**: 400 Bad Request
- **Display**: ❌ "Datos Inválidos"
- **Message**: "Los datos enviados no son válidos. Por favor verifica e intenta nuevamente."
- **Action**: No retry (user must fix input)

### 5. Not Found Errors
- **Trigger**: 404 Not Found
- **Display**: 🔍 "No Encontrado"
- **Message**: "No se encontró el recurso solicitado."
- **Action**: No retry (resource doesn't exist)

## Retry Strategy

### Dashboard Data
- **Retries**: 3 attempts
- **Delay**: Exponential backoff (1s, 2s, 4s)
- **Max Delay**: 30 seconds
- **Auto-refetch**: Every 30 seconds when successful

### Closings Data
- **Retries**: 2 attempts
- **Delay**: Fixed 1 second
- **Triggered**: Only when closings tab is active

### Manual Retry
- User can click "Reintentar" button at any time
- Bypasses automatic retry logic
- Immediate refetch

## User Experience Improvements

1. **Clear Error Messages**: All messages in Spanish, user-friendly language
2. **Visual Feedback**: Emoji icons for quick error type recognition
3. **Actionable Errors**: Retry buttons for recoverable errors
4. **Loading States**: Clear indication when data is being fetched
5. **Independent Error States**: Dashboard and closings errors don't interfere
6. **Graceful Degradation**: Other tabs continue to work if one fails

## Testing

See `src/types/errors.test.md` for comprehensive manual testing procedures.

## Future Enhancements

1. **Toast Notifications**: Show non-blocking error toasts for background operations
2. **Error Logging**: Send errors to monitoring service (e.g., Sentry)
3. **Offline Mode**: Cache data and sync when connection restored
4. **Error Recovery**: Automatic recovery strategies for specific error types
5. **User Feedback**: Allow users to report errors with context
6. **Retry Limits**: Prevent infinite retry loops with max attempt tracking

## Code Examples

### Using ErrorDisplay Component

```tsx
import ErrorDisplay from "@/components/ErrorDisplay";

// In your component
{error && (
  <ErrorDisplay 
    error={error} 
    onRetry={() => refetch()} 
    className="h-40"
  />
)}
```

### Parsing Errors

```tsx
import { parseError } from "@/types/errors";

try {
  await api.get("/endpoint");
} catch (error) {
  const appError = parseError(error);
  console.log(appError.userMessage); // User-friendly message
  console.log(appError.retryable); // Can retry?
}
```

### Error Handling in Actions

```tsx
const handleAction = async () => {
  try {
    await api.post("/endpoint", data);
    refetch(); // Refresh data on success
  } catch (error) {
    console.error('[Component] Error:', error);
    alert('Error al realizar la acción. Por favor intenta nuevamente.');
  }
};
```

## Dependencies

- **@tanstack/react-query**: Provides retry logic and query state management
- **React**: Component framework
- **TypeScript**: Type safety for error handling

## Files Modified

1. `src/types/errors.ts` - New error type system
2. `src/components/ErrorDisplay.tsx` - New error display component
3. `src/lib/api.ts` - Enhanced error handling in API client
4. `src/pages/dashboard/DashboardPage.tsx` - Comprehensive error handling

## Conclusion

This implementation provides a robust, user-friendly error handling system that:
- Categorizes errors appropriately
- Provides clear feedback to users
- Enables recovery from transient failures
- Maintains application stability
- Improves overall user experience

All error messages are in Spanish to match the application's language, and the system is designed to be extensible for future error types and recovery strategies.
