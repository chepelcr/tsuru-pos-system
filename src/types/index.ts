/**
 * Central export for all DTOs and types
 */

// Pagination
export type { PaginationResponse, PaginatedResponse } from "./pagination";

// Errors
export type { AppError } from "./errors";
export { ErrorType, parseError, getErrorIcon } from "./errors";

// Auth
export type { AuthUser, AuthContextValue, UserRole } from "./auth";

// Organization
export type { Organization, OrganizationListResponse } from "./organization";

// Products
export type { Product, ProductTax, ProductDiscount, Category, ProductListResponse } from "./product";

// Sessions
export type {
  Session,
  SessionType,
  SessionStatus,
  CreateSessionRequest,
  SessionListResponse,
} from "./session";

// Assignments
export type {
  Assignment,
  AssignmentRole,
  AssignmentStatus,
  AssignmentUser,
  AssignmentProduct,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  AssignmentListResponse,
} from "./assignment";

// Location
export type { LocationData } from "./location";

// Branches & Terminals
export type {
  Branch,
  BranchLocation,
  BranchType,
  BranchStatus,
  Terminal,
  CreateBranchRequest,
  CreateTerminalRequest,
  BranchListResponse,
  TerminalListResponse,
} from "./branch";

// Members
export type { Member, MemberListResponse } from "./member";

// Dashboard
export type { StandData, DashboardData, DashboardKPIs, ProductRankItem } from "./dashboard";
