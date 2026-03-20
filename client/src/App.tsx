import { useState, useEffect, useCallback } from 'react';
import { Leaf, Plus, RefreshCw, X, CheckCircle, LogOut, Users, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { InventoryItem, InsightResult, FilterState, PortfolioSummary } from './types';
import {
  getInventory,
  createItem,
  updateItem,
  deleteItem,
  getInsights,
  getBulkInsights,
  getPortfolioSummary,
} from './api/client';
import { Dashboard } from './components/Dashboard';
import { SearchFilter } from './components/SearchFilter';
import { InventoryTable } from './components/InventoryTable';
import { AddEditModal } from './components/AddEditModal';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { PortfolioSummaryModal } from './components/PortfolioSummaryModal';
import { LoginPage } from './components/LoginPage';
import { UsersPanel } from './components/UsersPanel';
import { useAuth } from './context/AuthContext';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

let toastCounter = 0;

export default function App() {
  const { token, logout } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ search: '', category: '', lowStock: false });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [selectedItemForInsights, setSelectedItemForInsights] = useState<InventoryItem | null>(null);
  const [currentInsight, setCurrentInsight] = useState<InsightResult | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightMode, setInsightMode] = useState<'ai' | 'rule'>('ai');

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshingAlerts, setRefreshingAlerts] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<InventoryItem | null>(null);

  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me').then(res => setCurrentUserId(res.data.id)).catch(() => {});
    }
  }, [token]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const [filtered, all] = await Promise.all([
        getInventory(filters),
        getInventory({}),
      ]);
      setItems(filtered);
      setAllItems(all);
    } catch {
      addToast('Failed to load inventory items', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    if (token) fetchItems();
  }, [fetchItems, token]);

  const handleAddItem = async (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createItem(data);
    setShowAddModal(false);
    addToast(`"${data.name}" added successfully!`, 'success');
    fetchItems();
  };

  const handleEditItem = async (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingItem) return;
    await updateItem(editingItem.id, data);
    setEditingItem(null);
    addToast(`"${data.name}" updated successfully!`, 'success');
    fetchItems();
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    await deleteItem(item.id);
    setDeleteConfirm(null);
    if (selectedItemForInsights?.id === item.id) {
      setSelectedItemForInsights(null);
      setCurrentInsight(null);
    }
    addToast(`"${item.name}" deleted.`, 'info');
    fetchItems();
  };

  const fetchInsights = useCallback(async (item: InventoryItem, mode: 'ai' | 'rule') => {
    setInsightsLoading(true);
    setCurrentInsight(null);
    try {
      const insight = await getInsights(item.id, mode);
      setCurrentInsight(insight);
    } catch {
      addToast('Failed to load insights', 'error');
    } finally {
      setInsightsLoading(false);
    }
  }, [addToast]);

  const handleInsights = (item: InventoryItem) => {
    setInsightMode('ai');
    setSelectedItemForInsights(item);
    fetchInsights(item, 'ai');
  };

  const handleToggleInsightMode = () => {
    if (!selectedItemForInsights) return;
    const newMode = insightMode === 'ai' ? 'rule' : 'ai';
    setInsightMode(newMode);
    fetchInsights(selectedItemForInsights, newMode);
  };

  const handlePortfolioSummary = async () => {
    setShowPortfolioModal(true);
    setPortfolioLoading(true);
    setPortfolioSummary(null);
    try {
      const result = await getPortfolioSummary();
      setPortfolioSummary(result);
    } catch {
      addToast('Failed to load portfolio summary', 'error');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleRefreshAlerts = async () => {
    setRefreshingAlerts(true);
    try {
      const results = await getBulkInsights();
      const critical = results.filter(r => r.insight.urgency === 'critical');
      const warning = results.filter(r => r.insight.urgency === 'warning');

      if (critical.length > 0) {
        addToast(
          `CRITICAL: ${critical.map(r => r.item.name).join(', ')} need immediate attention!`,
          'error'
        );
      }
      if (warning.length > 0) {
        addToast(
          `Warning: ${warning.map(r => r.item.name).join(', ')} are running low.`,
          'warning'
        );
      }
      if (critical.length === 0 && warning.length === 0) {
        addToast('All inventory levels look good!', 'success');
      }
    } catch {
      addToast('Failed to refresh alerts', 'error');
    } finally {
      setRefreshingAlerts(false);
    }
  };

  if (!token) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">GreenTrack</h1>
                <p className="text-emerald-200 text-xs">Inventory Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePortfolioSummary}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                <BarChart2 className="w-4 h-4" />
                AI Portfolio
              </button>
              <button
                onClick={handleRefreshAlerts}
                disabled={refreshingAlerts}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingAlerts ? 'animate-spin' : ''}`} />
                Refresh AI Alerts
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              <button
                onClick={() => setShowUsersPanel(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                title="Manage users"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Dashboard items={allItems} />
        <SearchFilter filters={filters} onChange={setFilters} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p>Loading inventory...</p>
            </div>
          </div>
        ) : (
          <InventoryTable
            items={items}
            onEdit={(item) => setEditingItem(item)}
            onDelete={(item) => setDeleteConfirm(item)}
            onInsights={handleInsights}
          />
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <AddEditModal
          onSubmit={handleAddItem}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <AddEditModal
          item={editingItem}
          onSubmit={handleEditItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Item</h3>
            <p className="text-gray-600 text-sm mb-5">
              Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Panel */}
      {selectedItemForInsights && (
        <AIInsightsPanel
          item={selectedItemForInsights}
          insight={currentInsight}
          loading={insightsLoading}
          mode={insightMode}
          onToggleMode={handleToggleInsightMode}
          onClose={() => {
            setSelectedItemForInsights(null);
            setCurrentInsight(null);
          }}
        />
      )}

      {/* Portfolio Summary Modal */}
      {showPortfolioModal && (
        <PortfolioSummaryModal
          summary={portfolioSummary}
          loading={portfolioLoading}
          onClose={() => setShowPortfolioModal(false)}
        />
      )}

      {/* Users Panel */}
      {showUsersPanel && currentUserId !== null && (
        <UsersPanel
          onClose={() => setShowUsersPanel(false)}
          currentUserId={currentUserId}
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-800 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            {toast.type === 'error' && <X className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="opacity-70 hover:opacity-100 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}