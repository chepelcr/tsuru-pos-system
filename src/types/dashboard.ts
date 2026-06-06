/**
 * Dashboard DTOs for Pollos Sales
 */

export interface StandData {
  id: string;
  name: string;
  cashier_name: string;
  context: string;
  total_revenue: number;
  sales_count: number;
  cash: number;
  sinpe: number;
  card: number;
  last_sync_at: number;
}

export interface ProductRankItem {
  name: string;
  emoji: string;
  units: number;
  revenue: number;
}

export interface DashboardData {
  stands: StandData[];
  total_revenue: number;
  total_sales: number;
  avg_ticket: number;
  product_ranking?: ProductRankItem[];
}

export interface DashboardKPIs {
  total_sales?: number;
  total_transactions?: number;
  average_ticket?: number;
  active_cashiers?: number;
}
