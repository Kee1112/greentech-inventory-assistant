import React from 'react';
import { Search, Filter } from 'lucide-react';
import { FilterState } from '../types';

const CATEGORIES = [
  'All',
  'Office Supplies',
  'Perishable Food',
  'Cleaning Supplies',
  'Lab Equipment',
  'Electronics',
];

interface SearchFilterProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({ filters, onChange }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange({ ...filters, category: value === 'All' ? '' : value });
  };

  const handleLowStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, lowStock: e.target.checked });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or category..."
          value={filters.search}
          onChange={handleSearchChange}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white"
        />
      </div>

      <div className="relative">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <select
          value={filters.category || 'All'}
          onChange={handleCategoryChange}
          className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white appearance-none cursor-pointer min-w-[170px]"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white cursor-pointer hover:border-emerald-400 transition-colors select-none">
        <input
          type="checkbox"
          checked={filters.lowStock}
          onChange={handleLowStockChange}
          className="w-4 h-4 accent-emerald-600 cursor-pointer"
        />
        <span className="text-sm text-gray-700 whitespace-nowrap">Low Stock Only</span>
      </label>
    </div>
  );
};
