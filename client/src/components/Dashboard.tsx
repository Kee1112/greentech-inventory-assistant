import React from 'react';
import { Package, AlertTriangle, Leaf, Clock } from 'lucide-react';
import { InventoryItem } from '../types';

interface DashboardProps {
  items: InventoryItem[];
}

function getSustainabilityColor(score: number): string {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}

function getSustainabilityBg(score: number): string {
  if (score >= 8) return 'bg-emerald-100';
  if (score >= 5) return 'bg-yellow-100';
  return 'bg-red-100';
}

export const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  const totalItems = items.length;

  const criticalItems = items.filter(item => item.quantity <= item.reorderThreshold).length;

  const avgSustainability =
    items.length > 0
      ? Math.round((items.reduce((sum, item) => sum + item.sustainabilityScore, 0) / items.length) * 10) / 10
      : 0;

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringItems = items.filter(item => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    return expiry <= sevenDaysFromNow && expiry > now;
  }).length;

  const stats = [
    {
      label: 'Total Items',
      value: totalItems,
      icon: Package,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      valueColor: 'text-emerald-800',
    },
    {
      label: 'Needs Reorder',
      value: criticalItems,
      icon: AlertTriangle,
      bgColor: criticalItems > 0 ? 'bg-red-50' : 'bg-emerald-50',
      iconColor: criticalItems > 0 ? 'text-red-500' : 'text-emerald-600',
      borderColor: criticalItems > 0 ? 'border-red-200' : 'border-emerald-200',
      valueColor: criticalItems > 0 ? 'text-red-700' : 'text-emerald-800',
    },
    {
      label: 'Avg. Sustainability',
      value: avgSustainability,
      icon: Leaf,
      bgColor: getSustainabilityBg(avgSustainability),
      iconColor: getSustainabilityColor(avgSustainability),
      borderColor: avgSustainability >= 8 ? 'border-emerald-200' : avgSustainability >= 5 ? 'border-yellow-200' : 'border-red-200',
      valueColor: getSustainabilityColor(avgSustainability),
      suffix: '/10',
    },
    {
      label: 'Expiring Soon',
      value: expiringItems,
      icon: Clock,
      bgColor: expiringItems > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      iconColor: expiringItems > 0 ? 'text-amber-500' : 'text-emerald-600',
      borderColor: expiringItems > 0 ? 'border-amber-200' : 'border-emerald-200',
      valueColor: expiringItems > 0 ? 'text-amber-700' : 'text-emerald-800',
      subtitle: 'within 7 days',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-4 flex items-center gap-4 shadow-sm`}
          >
            <div className={`p-3 rounded-full bg-white shadow-sm`}>
              <Icon className={`w-6 h-6 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.valueColor}`}>
                {stat.value}
                {stat.suffix && <span className="text-base font-medium">{stat.suffix}</span>}
              </p>
              {stat.subtitle && (
                <p className="text-xs text-gray-400">{stat.subtitle}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
