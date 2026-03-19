import React from 'react';
import { Pencil, Trash2, Sparkles, AlertCircle, ShoppingCart } from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onInsights: (item: InventoryItem) => void;
}

function getSustainabilityBadge(score: number) {
  if (score >= 8) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  return 'bg-red-100 text-red-800 border border-red-200';
}

function getRowHighlight(item: InventoryItem): string {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (item.expiryDate) {
    const expiry = new Date(item.expiryDate);
    if (expiry <= sevenDays && expiry > now) {
      return 'bg-amber-50 hover:bg-amber-100';
    }
  }

  if (item.quantity <= item.reorderThreshold) {
    return 'bg-red-50 hover:bg-red-100';
  }

  return 'hover:bg-gray-50';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiry = new Date(expiryDate);
  return expiry <= sevenDays && expiry > now;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEdit,
  onDelete,
  onInsights,
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No inventory items found</p>
        <p className="text-sm mt-1">Try adjusting your filters or add a new item.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-emerald-50 border-b border-emerald-100">
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Name</th>
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Category</th>
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Qty / Unit</th>
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Reorder At</th>
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Expiry</th>
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Eco Score</th>
            <th className="text-left px-4 py-3 font-semibold text-emerald-900">Supplier</th>
            <th className="text-center px-4 py-3 font-semibold text-emerald-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className={`transition-colors ${getRowHighlight(item)}`}>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800">{item.name}</div>
                {item.notes && (
                  <div className="text-xs text-gray-400 truncate max-w-[180px]" title={item.notes}>
                    {item.notes}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {item.category}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`font-semibold ${item.quantity <= item.reorderThreshold ? 'text-red-600' : 'text-gray-800'}`}>
                  {item.quantity}
                </span>
                <span className="text-gray-400 ml-1">{item.unit}</span>
                {item.quantity <= item.reorderThreshold && (
                  <span className="ml-2 text-xs text-red-500 font-medium">LOW</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {item.reorderThreshold} {item.unit}
              </td>
              <td className="px-4 py-3">
                {item.expiryDate ? (
                  <span className={isExpiringSoon(item.expiryDate) ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                    {formatDate(item.expiryDate)}
                    {isExpiringSoon(item.expiryDate) && (
                      <span className="ml-1 text-xs text-amber-500">(soon)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getSustainabilityBadge(item.sustainabilityScore)}`}>
                  {item.sustainabilityScore}/10
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 text-xs">
                {item.supplier}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  {item.quantity <= item.reorderThreshold && (
                    <a
                      href={`https://www.amazon.in/s?k=${encodeURIComponent(item.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Order on Amazon"
                      className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => onInsights(item)}
                    title="AI Insights"
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    title="Edit"
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
