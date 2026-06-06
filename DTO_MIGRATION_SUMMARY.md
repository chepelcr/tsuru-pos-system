# DTO Migration Summary - Pollos Sales

## Overview
Migrated all DTOs from inline definitions in hooks/components to centralized type files following snake_case convention. All legacy camelCase fields have been removed.

## New DTO Structure

### `/src/types/` Directory

1. **pagination.ts** - Standard pagination types
   - `PaginationResponse` - Standard pagination metadata
   - `PaginatedResponse<T>` - Generic paginated wrapper

2. **auth.ts** - Authentication types
   - `AuthUser` - User authentication data
   - `AuthContextValue` - Auth context interface
   - `UserRole` - User role enum

3. **organization.ts** - Organization types
   - `Organization` - Organization entity (snake_case)
   - `OrganizationListResponse` - List response

4. **product.ts** - Product types
   - `Product` - Product entity with snake_case fields
   - `Category` - Product category
   - `ProductListResponse` - Paginated product list

5. **session.ts** - Session types
   - `Session` - Session entity (snake_case)
   - `SessionType` - Session type enum
   - `SessionStatus` - Session status enum
   - `CreateSessionRequest` - Create session DTO
   - `SessionListResponse` - Paginated session list

6. **assignment.ts** - Assignment types
   - `Assignment` - Assignment entity (snake_case only)
   - `AssignmentRole` - Role enum
   - `AssignmentStatus` - Status enum
   - `CreateAssignmentRequest` - Create assignment DTO
   - `UpdateAssignmentRequest` - Update assignment DTO
   - `AssignmentListResponse` - Paginated assignment list

7. **branch.ts** - Branch and Terminal types
   - `Branch` - Branch entity (snake_case)
   - `Terminal` - Terminal entity (snake_case)
   - `BranchType` - Branch type enum
   - `BranchStatus` - Status enum
   - `CreateBranchRequest` - Create branch DTO
   - `CreateTerminalRequest` - Create terminal DTO
   - `BranchListResponse` - Paginated branch list
   - `TerminalListResponse` - Paginated terminal list

8. **member.ts** - Organization member types
   - `Member` - Organization member
   - `MemberListResponse` - Member list

9. **dashboard.ts** - Dashboard types
   - `StandData` - Stand/cashier data
   - `DashboardData` - Dashboard summary
   - `DashboardKPIs` - Key performance indicators

10. **index.ts** - Central export for all types

## Migration Status

### ✅ Completed
- Created centralized DTO files with snake_case convention
- Updated `useProducts` hook to use new Product DTO
- Updated `useOrganization` hook to use new Organization DTO
- Updated `useAssignment` hook to use proper Assignment DTO (snake_case)
- Created pagination types matching backend API
- **Removed all legacy camelCase fields**

### 📝 Notes
- All DTOs now use snake_case exclusively to match backend API responses
- Pagination structure is consistent across all list responses
- Components using assignments will need to be updated to use snake_case fields

### 🔄 Next Steps
Components that need updating to use snake_case Assignment fields:
- `POSPage.tsx` - Update to use `assignment.branch_id` instead of `assignment.standId`
- `InventoryOpening.tsx` - Update prop names
- `POSLayout.tsx` - Update to use snake_case fields
- `DashboardShell.tsx` - Update session display
- `db.ts` - Update IndexedDB schema to match snake_case

## Field Mapping Reference

### Assignment Fields (Old → New)
- `id` → `assignment_id`
- `standId` → `branch_id`
- `standName` → (fetch from Branch entity)
- `sessionId` → `session_id`
- `sessionName` → (fetch from Session entity)
- `context` → (removed, use branch type or session context)

## Usage Example

```typescript
// Import from centralized types
import type { Product, Session, Assignment } from '@/types';

// Use in components with snake_case
const assignment: Assignment = {
  assignment_id: '123',
  organization_id: 'org-1',
  session_id: 'session-1',
  user_id: 'user-1',
  branch_id: 'branch-1',
  role: 'cashier',
  start_time: '2024-01-01T10:00:00Z',
  status: 1,
  created_by: 'user-1'
};
```

## Benefits
1. **Consistency** - All DTOs follow snake_case convention matching backend
2. **Maintainability** - Single source of truth for type definitions
3. **Type Safety** - Centralized types prevent drift between components
4. **Documentation** - Clear structure makes it easy to find types
5. **Reusability** - Types can be imported anywhere in the app
6. **No Legacy Debt** - Clean migration without backward compatibility baggage
