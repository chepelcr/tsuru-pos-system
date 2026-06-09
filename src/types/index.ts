/**
 * Central export for all DTOs and types
 */

// Pagination
export type { PaginationResponse, PaginatedResponse } from "./pagination";

// Errors
export type { AppError } from "./errors";
export { ErrorType, parseError, getErrorIcon } from "./errors";

// Auth
export type { AuthUser, AuthContextValue, UserRole, UpdateProfileData } from "./auth";

// Organization
export type {
  Organization,
  OrganizationListResponse,
  OrganizationSettings,
  OrgThemeBranding,
  OrgContactSettings,
  OrgPaymentSettings,
  OrgShippingSettings,
  OrgGeneralSettings,
} from "./organization";

// Products
export type {
  Product,
  ProductTax,
  ProductDiscount,
  Category,
  ProductListResponse,
  InsertCategory,
  CategoryImagePayload,
} from "./product";

// Orders (store / marketplace — distinct from POS sales)
export type {
  Order,
  OrderLine,
  OrderParty,
  DeliveryLocation,
  OrderAttachments,
  OrderTotals,
  OrderStatus,
  ReportColorScheme,
  ReportColorOption,
  Crossdocking,
  CrossdockingSalePoint,
  CrossdockingSalePointItem,
  CrossdockingItemSummary,
  CrossdockingBoxSummary,
  CrossdockingTotals,
  CrossdockingAttachments,
  OrdersPagination,
  OrdersListResult,
} from "./order";
export { ORDER_STATUSES, ORDER_STATUS_CODES, REPORT_COLOR_OPTIONS } from "./order";

// Confirmations
export type {
  Confirmation,
  ConfirmationOrder,
  ConfirmationStatus,
  ConfirmationsPagination,
  ConfirmationsListResult,
  CreateConfirmationDto,
  UpdateConfirmationDto,
} from "./confirmation";

// Stores & Departments (B2B sub-entities)
export type { Store, StoreRequestDto, StoreListResponse, StoreUploadResult } from "./store";
export type {
  Department,
  DepartmentRequestDto,
  DepartmentListResponse,
} from "./department";

// Client extensions (notes)
export type { ClientNotesFields, UpdateClientNotesDto } from "./client";

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

// Storefront templates (CMS template gallery)
export type { Template } from "./storefront";
