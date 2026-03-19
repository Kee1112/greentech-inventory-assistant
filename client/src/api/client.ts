import axios from 'axios';
import { InventoryItem, InsightResult, FilterState, BulkInsightResult, PortfolioSummary } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export async function getInventory(filters: Partial<FilterState> = {}): Promise<InventoryItem[]> {
  const params: Record<string, string> = {};

  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.category && filters.category.trim()) {
    params.category = filters.category.trim();
  }
  if (filters.lowStock) {
    params.lowStock = 'true';
  }

  const response = await api.get<InventoryItem[]>('/inventory', { params });
  return response.data;
}

export async function getItem(id: number): Promise<InventoryItem> {
  const response = await api.get<InventoryItem>(`/inventory/${id}`);
  return response.data;
}

export async function createItem(
  data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<InventoryItem> {
  const response = await api.post<InventoryItem>('/inventory', data);
  return response.data;
}

export async function updateItem(
  id: number,
  data: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<InventoryItem> {
  const response = await api.put<InventoryItem>(`/inventory/${id}`, data);
  return response.data;
}

export async function deleteItem(id: number): Promise<void> {
  await api.delete(`/inventory/${id}`);
}

export async function getInsights(id: number, mode: 'ai' | 'rule' = 'ai'): Promise<InsightResult> {
  const response = await api.post<InsightResult>(`/ai/insights/${id}`, null, { params: { mode } });
  return response.data;
}

export async function getBulkInsights(): Promise<BulkInsightResult[]> {
  const response = await api.post<BulkInsightResult[]>('/ai/bulk-insights');
  return response.data;
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await api.post<PortfolioSummary>('/ai/portfolio-summary');
  return response.data;
}

export async function categorizeItem(name: string, notes: string): Promise<{ category: string }> {
  const response = await api.post<{ category: string }>('/ai/categorize', { name, notes });
  return response.data;
}
