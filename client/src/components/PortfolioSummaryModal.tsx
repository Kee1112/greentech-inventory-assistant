import React from 'react';
import { X, Loader2, Package, AlertTriangle, Leaf, Zap, TrendingUp, Bot } from 'lucide-react';
import { PortfolioSummary } from '../types';

interface PortfolioSummaryModalProps {
  summary: PortfolioSummary | null;
  loading: boolean;
  onClose: () => void;
}

export const PortfolioSummaryModal: React.FC<PortfolioSummaryModalProps> = ({
  summary,
  loading,
  onClose,
}) => {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-purple-200 text-xs font-medium uppercase tracking-wide">AI Analysis</p>
                <h2 className="font-bold text-lg leading-tight">Portfolio Summary</h2>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-purple-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-500" />
                <p className="font-medium">Analyzing your full inventory...</p>
                <p className="text-sm mt-1">Looking for cross-item opportunities</p>
              </div>
            ) : summary ? (
              <>
                {/* Headline */}
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-purple-800 leading-relaxed">{summary.headline}</p>
                  {summary.source === 'fallback' && (
                    <p className="text-xs text-gray-400 mt-1">Groq unavailable — showing rule-based summary</p>
                  )}
                </div>

                {/* Order Consolidation */}
                {summary.orderGroups.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-purple-500" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Consolidate These Orders</p>
                    </div>
                    <div className="space-y-2">
                      {summary.orderGroups.map((group, idx) => (
                        <div key={idx} className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                          <p className="text-sm font-semibold text-purple-800 mb-1">{group.supplier}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {group.items.map((item, i) => (
                              <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                {item}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-600">{group.saving}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hidden Risks */}
                {summary.riskItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hidden Risks</p>
                    </div>
                    <div className="space-y-2">
                      {summary.riskItems.map((r, idx) => (
                        <div key={idx} className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">{r.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{r.risk}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sustainability Wins */}
                {summary.sustainabilityWins.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-4 h-4 text-emerald-500" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sustainability Wins</p>
                    </div>
                    <div className="space-y-1.5">
                      {summary.sustainabilityWins.map((win, idx) => (
                        <div key={idx} className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-start gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-700">{win}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unusual Patterns */}
                {summary.unusualPatterns && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unusual Pattern Detected</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-xs text-gray-700">{summary.unusualPatterns}</p>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};