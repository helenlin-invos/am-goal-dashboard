import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fmtNTD, fmtPct, pct } from '../../utils/formatters.jsx';
import { STAGE_CONFIG, LEVEL_CONFIG } from '../../utils/constants.js';

export default function TabAMProgress({ amStats, loading }) {
  const [open, setOpen] = useState(null);
  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">資料載入中...</p>;

  return (
    <div className="space-y-3">
      {amStats.filter(a => a.acvTotal > 0).map(am => {
        const achv = pct(am.actual2026, am.acvTotal);
        const isOpen = open === am.ownerId;
        return (
          <div key={am.ownerId} className="card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                 onClick={() => setOpen(isOpen ? null : am.ownerId)}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                   style={{ background: am.color }}>{am.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-semibold text-gray-800 text-sm">{am.name}</span>
                  <span className="text-xs text-gray-400">{am.companies.length} 家客戶</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${Math.min(100,achv)}%`, background: achv>=100?'#10B981':am.color }} />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: am.color }}>{fmtPct(achv,0)}</span>
                </div>
              </div>
              <div className="hidden sm:grid grid-cols-3 gap-5 text-right flex-shrink-0 text-sm">
                <Metric label="ACV 目標" value={fmtNTD(am.acvTotal)} />
                <Metric label="今年實績" value={fmtNTD(am.actual2026)} bold color={am.color} />
                <Metric label="去年實績" value={fmtNTD(am.actual2025)} />
              </div>
              {isOpen ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
            </div>

            {/* Company list */}
            {isOpen && (
              <div className="border-t border-gray-100 px-5 pb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs mt-3">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="py-2 text-left font-medium">客戶名稱</th>
                        <th className="py-2 text-center font-medium">等級</th>
                        <th className="py-2 text-center font-medium">階段</th>
                        <th className="py-2 text-right font-medium">ACV 目標</th>
                        <th className="py-2 text-right font-medium">今年實績</th>
                        <th className="py-2 text-right font-medium">達成率</th>
                        <th className="py-2 text-left font-medium pl-4">下一步計畫</th>
                      </tr>
                    </thead>
                    <tbody>
                      {am.companies.sort((a,b)=>b.acv-a.acv).map(c => {
                        const cp = pct(c.actual2026, c.acv);
                        const sc = STAGE_CONFIG[c.stage];
                        const lc = LEVEL_CONFIG[c.level];
                        return (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 font-medium text-gray-700 max-w-32 truncate">{c.name}</td>
                            <td className="py-2 text-center">
                              {c.level && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                                      style={{ background: lc?.bg||'#F1F5F9', color: lc?.color||'#64748B' }}>
                                  {c.level.replace(' Account','').replace('Potential','Pot.')}
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-center">
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                                    style={{ background: sc?.bg||'#F1F5F9', color: sc?.color||'#64748B' }}>
                                {sc?.short || c.stage.slice(0,8)}
                              </span>
                            </td>
                            <td className="py-2 text-right text-gray-500">{fmtNTD(c.acv)}</td>
                            <td className="py-2 text-right font-medium">{fmtNTD(c.actual2026)}</td>
                            <td className="py-2 text-right font-bold"
                                style={{ color: cp>=100?'#10B981':cp<30?'#EF4444':am.color }}>
                              {fmtPct(cp,0)}
                            </td>
                            <td className="py-2 pl-4 text-gray-500 max-w-xs">
                              {c.plan || <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value, bold, color }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm ${bold?'font-bold':'font-medium text-gray-600'}`} style={color?{color}:{}}>
        {value}
      </p>
    </div>
  );
}
