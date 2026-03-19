export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderThreshold: number;
  expiryDate: string | null;
  lastRestocked: string;
  dailyUsageRate: number;
  supplier: string;
  sustainabilityScore: number; // 1-10
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsightResult {
  daysUntilEmpty: number;
  needsReorder: boolean;
  urgency: 'critical' | 'warning' | 'ok';
  urgencyReason?: string;
  reorderMessage: string;
  sustainabilityTip: string;
  alternativeSuppliers?: string[];
  dailyProjection?: number[];
  source: 'ai' | 'fallback';
}

export interface FilterState {
  search: string;
  category: string;
  lowStock: boolean;
}

export interface BulkInsightResult {
  item: InventoryItem;
  insight: InsightResult;
}

export interface PortfolioSummary {
  headline: string;
  orderGroups: { supplier: string; items: string[]; saving: string }[];
  riskItems: { name: string; risk: string }[];
  sustainabilityWins: string[];
  unusualPatterns: string | null;
  source: 'ai' | 'fallback';
}
