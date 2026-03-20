import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         Cell, ReferenceLine, Legend } from 'recharts';
import { fmtNTD, fmtPct, pct } from '../../utils/formatters.jsx';
import { AM_LIST, LEVEL_CONFIG } from '../../utils/constants.js';

export default function TabYoY({ companies, amStats, teamActual26, teamActual25, loading }) {
  const [view, setView] = useState('am'); // am | level | top20

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">資料載入中...</p>;

  const teamYoY = teamActual25 > 0
    ? ((teamActual26 - teamActual25) / teamActual25) * 100 : null;

  // AM 維度
  const amData = amStats.filter(a => a.acvTotal > 0).map(a => ({
    name:   a.name,
    去年:   a.actual2025,
    今年:   a.actual2026,
    yoy:    a.actual2025 > 0 ? ((a.actual2026-a.actual2025)/a.actual2025)*100 : null,
    color:  a.color,
  }));

  // 等級維度
  const byLevel = {};
  companies.forEach(c => {
    const k = c.level || '未分類';
    if (!byLevel[k]) byLevel[k] = { name: k, 去年: 0, 今年: 0 };
    byLevel[k]['去年'] += c.actual2025;
    byLevel[k]['今年'] += c.actual2026;
  });
  const levelData = Object.values(byLevel).sort((a,b)=>b['今年']-a['今年']);

  // Top 20 客戶 YoY
  const top20 = [...companies]
    .filter(c => c.actual2025 > 0 || c.actual2026 > 0)
    .sort((a,b) => b.actual2026 - a.actual2026)
    .slice(0, 20)
    .map(c => ({
      name: c.name.slice(0, 8),
      去年: c.actual2025,
      今年: c.actual2026,
      yoy:  c.actual2025 > 0 ? ((c.actual2026-c.actual2025)/c.actual2025)*100 : null,
      color: c.amColor,
    }));

  const chartData = view==='am' ? amData : view==='level' ? levelData : top20;

  return (
    <div className="space-y-5">
      {/* Team YoY banner */}
      <div className="card p-5 flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 mb-1">今年實績合計</p>
          <p className="text-2xl font-bold text-gray-800">{fmtNTD(teamActual26)}</p>
        </div>
        <div className="text-2xl text-gray-200">vs</div>
        <div>
          <p className="text-xs text-gray-400 mb-1">去年實績合計</p>
          <p className="text-2xl font-bold text-gray-500">{fmtNTD(teamActual25)}</p>
        </div>
        {teamYoY !== null && (
          <div className="ml-auto">
            <p className="text-xs text-gray-400 mb-1">YoY 成長</p>
            <p className="text-2xl font-bold" style={{ color: teamYoY>=0?'#10B981':'#EF4444' }}>
              {teamYoY>=0?'▲':'▼'} {Math.abs(teamYoY).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* View toggle + Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-gray-700 text-sm">今年 vs 去年比較</h2>
          <div className="flex gap-2">
            {[{id:'am',label:'依 AM'},{id:'level',label:'依等級'},{id:'top20',label:'Top 20 客戶'}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                  ${view===v.id?'text-white':'bg-white text-gray-500 border border-gray-200'}`}
                      style={view===v.id?{background:'#1B3A5C'}:{}}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={3}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={v=>`${(v/1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v,n)=>[fmtNTD(v),n]} />
            <Legend />
            <Bar dataKey="去年" fill="#E2E8F0" radius={[3,3,0,0]} />
            <Bar dataKey="今年" radius={[3,3,0,0]}>
              {chartData.map((e,i)=><Cell key={i} fill={e.color||'#2563EB'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-company YoY table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">客戶 YoY 明細（依今年實績排序）</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium">客戶名稱</th>
                <th className="px-4 py-3 text-center font-medium">AM</th>
                <th className="px-4 py-3 text-right font-medium">去年實績</th>
                <th className="px-4 py-3 text-right font-medium">今年實績</th>
                <th className="px-4 py-3 text-right font-medium">YoY</th>
                <th className="px-4 py-3 text-right font-medium">ACV 目標</th>
                <th className="px-4 py-3 text-right font-medium">達成率</th>
              </tr>
            </thead>
            <tbody>
              {[...companies]
                .sort((a,b)=>b.actual2026-a.actual2026)
                .filter(c=>c.actual2025>0||c.actual2026>0)
                .map(c => {
                  const yoy = c.actual2025>0 ? ((c.actual2026-c.actual2025)/c.actual2025)*100 : null;
                  const cp  = pct(c.actual2026, c.acv);
                  return (
                    <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                              style={{ background: c.amColor }}>{c.amName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{fmtNTD(c.actual2025)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmtNTD(c.actual2026)}</td>
                      <td className="px-4 py-2.5 text-right font-bold">
                        {yoy !== null
                          ? <span style={{ color: yoy>=0?'#10B981':'#EF4444' }}>
                              {yoy>=0?'▲':'▼'}{Math.abs(yoy).toFixed(0)}%
                            </span>
                          : <span className="text-gray-300">新客</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{fmtNTD(c.acv)}</td>
                      <td className="px-4 py-2.5 text-right font-bold"
                          style={{ color: cp>=100?'#10B981':cp<30?'#EF4444':'#64748B' }}>
                        {fmtPct(cp,0)}
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
