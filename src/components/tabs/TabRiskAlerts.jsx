import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { fmtNTD } from '../../utils/formatters.jsx';
import { STAGE_CONFIG, LEVEL_CONFIG, OWNER_MAP } from '../../utils/constants.js';

export default function TabRiskAlerts({ companies, loading }) {
  const [filter, setFilter] = useState('all'); // all | atRisk | churned | high

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">資料載入中...</p>;

  const atRisk  = companies.filter(c => c.stage.includes('At Risk'));
  const churned = companies.filter(c => c.stage.includes('Churned'));
  const highRisk = companies.filter(c => c.risk.level === 'high');

  const lists = {
    all:     [...atRisk, ...churned.filter(c => !atRisk.includes(c))],
    atRisk,
    churned,
    high:    highRisk,
  };
  const shown = lists[filter].sort((a,b) => b.acv - a.acv);

  const totalAtRiskAcv = atRisk.reduce((s,c)=>s+c.acv,0);

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      {atRisk.length > 0 && (
        <div className="rounded-xl p-4 border flex items-start gap-3"
             style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">
              {atRisk.length} 家客戶處於高風險，ACV 合計 {fmtNTD(totalAtRiskAcv)}
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {atRisk.slice(0,5).map(c=>c.name).join('、')}{atRisk.length>5?` 等 ${atRisk.length} 家`:''}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id:'all',     label:`全部風險 (${lists.all.length})`   },
          { id:'atRisk',  label:`At Risk (${atRisk.length})`       },
          { id:'churned', label:`Churned (${churned.length})`      },
          { id:'high',    label:`HIGH 風險 (${highRisk.length})`   },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${filter===f.id ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                {['客戶名稱','負責 AM','等級','客戶階段','ACV 目標','今年實績','客戶風險','下一步計畫'].map(h => (
                  <th key={h} className={`px-4 py-3 ${h==='客戶名稱'||h==='下一步計畫'||h==='客戶風險'?'text-left':'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">無符合條件的客戶</td></tr>
              ) : shown.map(c => {
                const sc = STAGE_CONFIG[c.stage];
                const lc = LEVEL_CONFIG[c.level];
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <AMBadge am={c.am} name={c.amName} color={c.amColor} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ background:lc?.bg||'#F1F5F9', color:lc?.color||'#64748B' }}>
                        {c.level||'-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background:sc?.bg||'#F1F5F9', color:sc?.color||'#64748B' }}>
                        {sc?.short||c.stage.slice(0,10)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 text-xs">{fmtNTD(c.acv)}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium">{fmtNTD(c.actual2026)}</td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={c.risk} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                      {c.plan || <span className="text-gray-300">尚未填寫</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AMBadge({ am, name, color }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ background: color }}>
      {name}
    </span>
  );
}

function RiskBadge({ risk }) {
  return (
    <span className="text-xs font-medium max-w-48 block leading-tight" style={{ color: risk.color }}>
      {risk.label || '—'}
    </span>
  );
}
