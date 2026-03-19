import React from 'react';
import { X, Loader2, AlertTriangle, CheckCircle, Clock, Leaf, ShoppingCart, Bot, Cpu } from 'lucide-react';
import { InsightResult, InventoryItem } from '../types';

interface AIInsightsPanelProps {
  item: InventoryItem | null;
  insight: InsightResult | null;
  loading: boolean;
  mode: 'ai' | 'rule';
  onToggleMode: () => void;
  onClose: () => void;
}

function UsageChart({ projection, reorderThreshold, unit }: {
  projection: number[];
  reorderThreshold: number;
  unit: string;
}) {
  const W = 320, H = 110, PAD = { top: 10, right: 12, bottom: 24, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...projection, reorderThreshold) * 1.1;
  const days = projection.length;

  const xScale = (i: number) => PAD.left + (i / (days - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const linePath = projection
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L${xScale(days - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const thresholdY = yScale(reorderThreshold);
  const crossDay = projection.findIndex(v => v <= reorderThreshold);

  const yTicks = [0, Math.round(maxVal * 0.5), Math.round(maxVal)];

  return (
    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        14-Day Usage Projection
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis ticks */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={yScale(tick)} y2={yScale(tick)}
              stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
            <text x={PAD.left - 4} y={yScale(tick) + 3.5} textAnchor="end"
              fontSize="8" fill="#9ca3af">{tick}</text>
          </g>
        ))}

        {/* Reorder threshold line */}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={thresholdY} y2={thresholdY}
          stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" />
        <text x={PAD.left + innerW + 2} y={thresholdY + 3.5} fontSize="8" fill="#f97316">min</text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" />

        {/* Crossover dot */}
        {crossDay >= 0 && (
          <circle cx={xScale(crossDay)} cy={yScale(projection[crossDay])} r="4"
            fill="#f97316" stroke="white" strokeWidth="1.5" />
        )}

        {/* X-axis day labels */}
        {[0, 3, 6, 9, 13].map(i => (
          <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle"
            fontSize="8" fill="#9ca3af">d{i + 1}</text>
        ))}
      </svg>
      <p className="text-xs text-gray-400 mt-1">
        Orange dot = hits reorder threshold · Dashed = min level · Unit: {unit}
        {' · Linear estimate'}
      </p>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: InsightResult['urgency'] }) {
  if (urgency === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 border border-red-200">
        <AlertTriangle className="w-4 h-4" />
        Critical
      </span>
    );
  }
  if (urgency === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="w-4 h-4" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle className="w-4 h-4" />
      Good
    </span>
  );
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  item,
  insight,
  loading,
  mode,
  onToggleMode,
  onClose,
}) => {
  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-5 py-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide mb-1">Insights</p>
              <h2 className="font-bold text-lg leading-tight truncate">{item.name}</h2>
              <p className="text-emerald-200 text-sm mt-0.5">{item.category}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-emerald-600 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center bg-emerald-800/50 rounded-lg p-1 gap-1">
            <button
              onClick={() => mode !== 'rule' && onToggleMode()}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'rule' ? 'bg-white text-emerald-800' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Rule-based
            </button>
            <button
              onClick={() => mode !== 'ai' && onToggleMode()}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'ai' ? 'bg-white text-emerald-800' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI (Groq)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
              <p className="font-medium">Analyzing inventory...</p>
              <p className="text-sm mt-1">Generating smart insights</p>
            </div>
          ) : insight ? (
            <>
              {/* Urgency + Days Until Empty */}
              <div className={`rounded-xl p-4 ${insight.source === 'ai' ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <UrgencyBadge urgency={insight.urgency} />
                  <div className="text-right">
                    <p className="text-3xl font-black text-gray-800">
                      {insight.daysUntilEmpty >= 9999 ? '∞' : insight.daysUntilEmpty}
                    </p>
                    <p className="text-xs text-gray-500">days until empty</p>
                  </div>
                </div>
                {mode === 'ai' && insight.urgencyReason && (
                  <div className="mt-3 flex items-start gap-2 bg-purple-100 rounded-lg px-3 py-2">
                    <Bot className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-purple-800 leading-relaxed">
                      <span className="font-semibold">AI reasoning: </span>{insight.urgencyReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Current Stock Info */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Current stock</span>
                  <span className="font-semibold text-gray-800">{item.quantity} {item.unit}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Reorder threshold</span>
                  <span className={`font-semibold ${item.quantity <= item.reorderThreshold ? 'text-red-600' : 'text-gray-800'}`}>
                    {item.reorderThreshold} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Daily usage</span>
                  <span className="font-semibold text-gray-800">{item.dailyUsageRate} {item.unit}/day</span>
                </div>
              </div>

              {/* Reorder Message */}
              <div className={`rounded-xl p-4 border ${
                insight.urgency === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : insight.urgency === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-start gap-2">
                  <ShoppingCart className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    insight.urgency === 'critical'
                      ? 'text-red-500'
                      : insight.urgency === 'warning'
                      ? 'text-amber-500'
                      : 'text-emerald-600'
                  }`} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Reorder Recommendation</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{insight.reorderMessage}</p>
                  </div>
                </div>
              </div>

              {/* Sustainability Tip (AI only) */}
              {mode === 'ai' && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-start gap-2">
                    <Leaf className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Sustainability Tip <span className="normal-case text-purple-500">(AI-generated)</span>
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">{insight.sustainabilityTip}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Projection Chart */}
              {(() => {
                const proj = Array.from({ length: 14 }, (_, i) =>
                  Math.max(0, item.quantity - (i + 1) * item.dailyUsageRate)
                );
                return (
                  <UsageChart
                    projection={proj}
                    reorderThreshold={item.reorderThreshold}
                    unit={item.unit}
                  />
                );
              })()}

              {/* Alternative Suppliers (AI only) */}
              {insight.alternativeSuppliers && insight.alternativeSuppliers.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Eco-Friendly Alternative Suppliers
                  </p>
                  <ul className="space-y-1">
                    {insight.alternativeSuppliers.map((supplier, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        {supplier}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertTriangle className="w-10 h-10 mb-4 opacity-40" />
              <p className="font-medium">No insights available</p>
              <p className="text-sm mt-1">Unable to load insights at this time.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
