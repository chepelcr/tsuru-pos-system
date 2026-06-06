# Error Handling Test Plan

This document describes how to manually test the enhanced error handling in DashboardPage.

## Test Cases

### 1. Network Error (No Internet Connection)

**Steps:**
1. Open the application and log in
2. Navigate to the dashboard
3. Disconnect from the internet (turn off WiFi/unplug ethernet)
4. Click the "Actualizar" (Refresh) button

**Expected Result:**
- Error display shows 📡 icon
- Title: "Error de Conexión"
- Message: "No se pudo conectar al servidor. Verifica tu conexión a internet."
- "Reintentar" button is visible and enabled

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 2. Authentication Error (Expired Session)

**Steps:**
1. Open the application and log in
2. Manually expire the session (clear auth tokens from localStorage or wait for token expiration)
3. Try to refresh the dashboard

**Expected Result:**
- Error display shows 🔒 icon
- Title: "Sesión Expirada"
- Message: "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
- "Iniciar Sesión" button redirects to /login

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 3. Server Error (500)

**Steps:**
1. Mock the API to return a 500 error
2. Navigate to the dashboard or click refresh

**Expected Result:**
- Error display shows ⚠️ icon
- Title: "Error del Servidor"
- Message: "Error del servidor. Por favor intenta nuevamente en unos momentos."
- "Reintentar" button is visible

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 4. Not Found Error (404)

**Steps:**
1. Mock the API to return a 404 error
2. Navigate to the dashboard

**Expected Result:**
- Error display shows 🔍 icon
- Title: "No Encontrado"
- Message: "No se encontró el recurso solicitado."
- No retry button (not retryable)

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 5. Retry Functionality

**Steps:**
1. Trigger any retryable error (network or server error)
2. Fix the underlying issue (reconnect internet, fix server)
3. Click the "Reintentar" button

**Expected Result:**
- Loading state is shown
- Data loads successfully
- Error display disappears

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 6. Automatic Retry with Exponential Backoff

**Steps:**
1. Mock the API to fail 2 times then succeed
2. Navigate to the dashboard

**Expected Result:**
- React Query automatically retries up to 3 times
- Retry delays increase exponentially (1s, 2s, 4s)
- After successful retry, data is displayed

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 7. Closings Tab Error Handling

**Steps:**
1. Navigate to the "Cierres" tab
2. Mock the closings API to return an error

**Expected Result:**
- Error display is shown in the closings tab
- "Reintentar" button refetches closings data
- Other tabs still work

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 8. Approve/Reject Closing Error Handling

**Steps:**
1. Navigate to the "Cierres" tab with pending closings
2. Mock the approve/reject API to fail
3. Click "Aprobar" or "Rechazar" button

**Expected Result:**
- Alert is shown with error message
- Closing status is not changed
- User can retry the action

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 9. Refresh Button State

**Steps:**
1. Click the "Actualizar" button while data is loading

**Expected Result:**
- Button shows "⟳ Actualizando..." text
- Button is disabled during refresh
- Button returns to "↻ Actualizar" after completion

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

### 10. Multiple Error Scenarios

**Steps:**
1. Trigger a network error on dashboard data
2. Switch to "Cierres" tab
3. Trigger a different error on closings data

**Expected Result:**
- Each tab shows its own error state independently
- Errors don't interfere with each other
- Retry buttons work for their respective queries

**Actual Behavior:**
- [ ] Pass
- [ ] Fail

---

## Notes

- All error messages are in Spanish to match the application language
- Error icons are emoji-based for visual clarity
- Retry functionality uses React Query's built-in retry mechanism
- Error parsing handles various error formats from the API
