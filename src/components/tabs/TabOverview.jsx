import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         Cell, PieChart, Pie, Legend } from 'recharts';
import { fmtNTD, fmtPct, pct } from '../../utils/formatters.jsx';
import { STAGE_CONFIG, LEVEL_CONFIG, AM_LIST } from '../../utils/constants.js';

export default function TabOverview({ companies, amStats, teamAcv, teamActual26, teamActual25, teamPct, loading }) {
  if (loading) return <Skeleton />;

  // Level distribution
  const levelCounts = {};
  companies.forEach(c => { levelCounts[c.level] = (levelCounts[c.level]||0) + 1; });
  const levelData = Object.entries(levelCounts).map(([name, value]) => ({
    name, value, color: LEVEL_CONFIG[name]?.color || '#9CA3AF',
  }));

  // Stage distribution
  const stageCounts = {};
  companies.forEach(c => {
    const short = STAGE_CONFIG[c.stage]?.short || c.stage || '其他';
    stageCounts[short] = (stageCounts[short]||0)+1;
  });
  const stageData = Object.entries(stageCounts).map(([name, value]) => ({
    name, value, color: Object.values(STAGE_CONFIG).find(s=>s.short===name)?.color || '#9CA3AF',
  }));

  // AM bar chart
  const amBar = amStats.filter(a => a.acvTotal > 0).map(a => ({
    name:   a.name,
    'ACV 目標': a.acvTotal,
    '今年實績': a.actual2026,
    color:  a.color,
  }));

  const atRisk   = companies.filter(c => c.stage.includes('At Risk')).length;
  const churned  = companies.filter(c => c.stage.includes('Churned')).length;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="全隊 ACV 目標"  value={fmtNTD(teamAcv)}      sub={`${companies.length} 家客戶`}          color="#1B3A5C" />
        <KpiCard label="今年實績合計"    value={fmtNTD(teamActual26)} sub={`達成率 ${fmtPct(teamPct)}`}
                 color={teamPct >= 50 ? '#10B981' : '#EF4444'} />
        <KpiCard label="去年實績"        value={fmtNTD(teamActual25)} sub="YoY 基準"                              color="#64748B" />
        <KpiCard label="高風險 / 流失"   value={`${atRisk} / ${churned} 家`}
                 sub="At Risk + Churned"                                                                          color="#EF4444" />
      </div>

      {/* AM progress */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm">各 AM — ACV 目標 vs 今年實績</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={amBar} barGap={3}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => [fmtNTD(v), n]} />
            <Legend />
            <Bar dataKey="ACV 目標" fill="#E2E8F0" radius={[3,3,0,0]} />
            <Bar dataKey="今年實績" radius={[3,3,0,0]}>
              {amBar.map((e,i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Level + Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">客戶等級分布</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={levelData} dataKey="value" nameKey="name"
                   cx="50%" cy="50%" outerRadius={75} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                   labelLine={false}>
                {levelData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">客戶階段分布</h2>
          <div className="space-y-2.5">
            {stageData.sort((a,b)=>b.value-a.value).map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-16 text-xs text-right font-medium" style={{ color: s.color }}>{s.name}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.value/companies.length)*100}%`, background: s.color }} />
                </div>
                <div className="w-6 text-xs text-gray-500 text-right">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AM achievement table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">AM 目標達成率</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase bg-gray-50">
                {['AM','ACV 目標','今年實績','達成率','去年實績','YoY'].map(h => (
                  <th key={h} className={`px-5 py-3 ${h==='AM'?'text-left':'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {amStats.filter(a=>a.acvTotal>0).map(a => {
                const achv = pct(a.actual2026, a.acvTotal);
                const yoy  = a.actual2025 > 0
                  ? ((a.actual2026 - a.actual2025) / a.actual2025) * 100 : null;
                return (
                  <tr key={a.ownerId} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: a.color }} />
                        <span className="font-medium text-gray-800">{a.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{fmtNTD(a.acvTotal)}</td>
                    <td className="px-5 py-3 text-right font-medium">{fmtNTD(a.actual2026)}</td>
                    <td className="px-5 py-3 text-right">
                      <AchvBar pct={achv} color={a.color} />
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">{fmtNTD(a.actual2025)}</td>
                    <td className="px-5 py-3 text-right">
                      {yoy !== null
                        ? <span className={`text-xs font-medium ${yoy>=0?'text-green-600':'text-red-500'}`}>
                            {yoy>=0?'▲':'▼'} {Math.abs(yoy).toFixed(1)}%
                          </span>
                        : <span className="text-gray-300 text-xs">-</span>}
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

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold mb-1" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function AchvBar({ pct: p, color }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100,p)}%`, background: p>=100?'#10B981':color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color: p>=100?'#10B981':p<30?'#EF4444':'inherit' }}>
        {fmtPct(p,0)}
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="card h-20 bg-gray-50"/>)}</div>
      <div className="card h-60 bg-gray-50" />
      <div className="grid grid-cols-2 gap-5">{[...Array(2)].map((_,i)=><div key={i} className="card h-52 bg-gray-50"/>)}</div>
    </div>
  );
}
