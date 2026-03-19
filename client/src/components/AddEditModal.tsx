import React, { useState, useEffect } from 'react';
import { X, Wand2, Loader2 } from 'lucide-react';
import { InventoryItem } from '../types';
import { categorizeItem } from '../api/client';

const CATEGORIES = [
  'Office Supplies',
  'Perishable Food',
  'Cleaning Supplies',
  'Lab Equipment',
  'Electronics',
];

type FormData = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;

interface AddEditModalProps {
  item?: InventoryItem | null;
  onSubmit: (data: FormData) => Promise<void>;
  onClose: () => void;
}

const defaultForm: FormData = {
  name: '',
  category: 'Office Supplies',
  quantity: 0,
  unit: '',
  reorderThreshold: 0,
  expiryDate: null,
  lastRestocked: new Date().toISOString().split('T')[0],
  dailyUsageRate: 0.1,
  supplier: '',
  sustainabilityScore: 5,
  notes: '',
};

function toDateInputValue(isoString: string | null): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

export const AddEditModal: React.FC<AddEditModalProps> = ({ item, onSubmit, onClose }) => {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        reorderThreshold: item.reorderThreshold,
        expiryDate: item.expiryDate,
        lastRestocked: item.lastRestocked,
        dailyUsageRate: item.dailyUsageRate,
        supplier: item.supplier,
        sustainabilityScore: item.sustainabilityScore,
        notes: item.notes,
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [item]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (form.quantity < 0) newErrors.quantity = 'Quantity must be 0 or greater';
    if (!form.unit.trim()) newErrors.unit = 'Unit is required';
    if (form.dailyUsageRate <= 0) newErrors.dailyUsageRate = 'Daily usage rate must be positive';
    if (!form.supplier.trim()) newErrors.supplier = 'Supplier is required';
    if (!form.lastRestocked) newErrors.lastRestocked = 'Last restocked date is required';
    if (form.sustainabilityScore < 1 || form.sustainabilityScore > 10)
      newErrors.sustainabilityScore = 'Score must be 1–10';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(prev => ({
      ...prev,
      expiryDate: value ? new Date(value).toISOString() : null,
    }));
  };

  const handleLastRestockedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(prev => ({
      ...prev,
      lastRestocked: value ? new Date(value).toISOString() : prev.lastRestocked,
    }));
  };

  const handleAutoCategorize = async () => {
    if (!form.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Enter a name first to auto-categorize' }));
      return;
    }
    setCategorizing(true);
    try {
      const result = await categorizeItem(form.name, form.notes);
      setForm(prev => ({ ...prev, category: result.category }));
    } catch {
      // Silently fail — keep current category
    } finally {
      setCategorizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Recycled Copy Paper A4"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Category + Auto-categorize */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex gap-2">
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAutoCategorize}
                disabled={categorizing}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm hover:bg-emerald-100 transition-colors disabled:opacity-60"
                title="Use AI to suggest a category"
              >
                {categorizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Auto-categorize
              </button>
            </div>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  errors.quantity ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g. kg, units, bottles"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  errors.unit ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.unit && <p className="mt-1 text-xs text-red-500">{errors.unit}</p>}
            </div>
          </div>

          {/* Reorder Threshold + Daily Usage Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Threshold</label>
              <input
                type="number"
                name="reorderThreshold"
                value={form.reorderThreshold}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Usage Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="dailyUsageRate"
                value={form.dailyUsageRate}
                onChange={handleChange}
                min="0.001"
                step="0.001"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  errors.dailyUsageRate ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.dailyUsageRate && <p className="mt-1 text-xs text-red-500">{errors.dailyUsageRate}</p>}
            </div>
          </div>

          {/* Expiry Date + Last Restocked */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={toDateInputValue(form.expiryDate)}
                onChange={handleExpiryChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Restocked <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={toDateInputValue(form.lastRestocked)}
                onChange={handleLastRestockedChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                  errors.lastRestocked ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.lastRestocked && <p className="mt-1 text-xs text-red-500">{errors.lastRestocked}</p>}
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              placeholder="e.g. EcoPaper Co."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                errors.supplier ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.supplier && <p className="mt-1 text-xs text-red-500">{errors.supplier}</p>}
          </div>

          {/* Sustainability Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sustainability Score: <span className="font-bold text-emerald-700">{form.sustainabilityScore}/10</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-500 w-6 text-right">1</span>
              <input
                type="range"
                name="sustainabilityScore"
                value={form.sustainabilityScore}
                onChange={handleChange}
                min="1"
                max="10"
                step="1"
                className="flex-1 accent-emerald-600"
              />
              <span className="text-xs text-emerald-600 w-6">10</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-6">
              <span>Low eco impact</span>
              <span>High eco impact</span>
            </div>
            {errors.sustainabilityScore && (
              <p className="mt-1 text-xs text-red-500">{errors.sustainabilityScore}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Optional notes about this item..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
