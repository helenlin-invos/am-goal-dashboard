import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { fmtNTD, fmtPct, pct } from '../../utils/formatters.jsx';
import { STAGE_CONFIG, LEVEL_CONFIG, AM_LIST } from '../../utils/constants.js';

const SORT_FIELDS = [
  { id:'name',   label:'客戶名稱' },
  { id:'acv',    label:'ACV 目標' },
  { id:'actual', label:'今年實績' },
  { id:'pct',    label:'達成率'   },
];

export default function TabClientList({ companies, loading }) {
  const [search, setSearch] = useState('');
  const [amF,    setAmF]    = useState('all');
  const [stageF, setStageF] = useState('all');
  const [levelF, setLevelF] = useState('all');
  const [sortBy, setSortBy] = useState('acv');
  const [sortDir,setSortDir]= useState('desc');

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">資料載入中...</p>;

  const filtered = useMemo(() => {
    let list = companies;
    if (search)       list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.plan.toLowerCase().includes(search.toLowerCase()));
    if (amF !== 'all')    list = list.filter(c => c.ownerId === amF);
    if (stageF !== 'all') list = list.filter(c => c.stage === stageF);
    if (levelF !== 'all') list = list.filter(c => c.level === levelF);

    return [...list].sort((a,b) => {
      let va, vb;
      if (sortBy==='name')   { va=a.name; vb=b.name; return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va); }
      if (sortBy==='acv')    { va=a.acv;  vb=b.acv;  }
      if (sortBy==='actual') { va=a.actual2026; vb=b.actual2026; }
      if (sortBy==='pct')    { va=pct(a.actual2026,a.acv); vb=pct(b.actual2026,b.acv); }
      return sortDir==='asc' ? va-vb : vb-va;
    });
  }, [companies, search, amF, stageF, levelF, sortBy, sortDir]);

  const stages = [...new Set(companies.map(c=>c.stage).filter(Boolean))];
  const levels = [...new Set(companies.map(c=>c.level).filter(Boolean))];

  const sortToggle = (f) => {
    if (sortBy === f) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortBy(f); setSortDir('desc'); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
                 placeholder="搜尋客戶名稱、計畫..."
                 className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" />
        </div>
        <Select value={amF} onChange={e=>setAmF(e.target.value)}>
          <option value="all">全部 AM</option>
          {AM_LIST.map(a=><option key={a.ownerId} value={a.ownerId}>{a.name}</option>)}
        </Select>
        <Select value={stageF} onChange={e=>setStageF(e.target.value)}>
          <option value="all">全部階段</option>
          {stages.map(s=><option key={s} value={s}>{STAGE_CONFIG[s]?.short||s}</option>)}
        </Select>
        <Select value={levelF} onChange={e=>setLevelF(e.target.value)}>
          <option value="all">全部等級</option>
          {levels.map(l=><option key={l} value={l}>{l}</option>)}
        </Select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} 筆</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 bg-gray-50 border-b border-gray-100">
                <Th onClick={()=>sortToggle('name')} active={sortBy==='name'} dir={sortDir}>客戶名稱</Th>
                <th className="px-4 py-3 text-center font-medium">AM</th>
                <th className="px-4 py-3 text-center font-medium">等級</th>
                <th className="px-4 py-3 text-center font-medium">階段</th>
                <Th onClick={()=>sortToggle('acv')}    active={sortBy==='acv'}    dir={sortDir} right>ACV 目標</Th>
                <Th onClick={()=>sortToggle('actual')} active={sortBy==='actual'} dir={sortDir} right>今年實績</Th>
                <Th onClick={()=>sortToggle('pct')}    active={sortBy==='pct'}    dir={sortDir} right>達成率</Th>
                <th className="px-4 py-3 text-left font-medium">客戶風險</th>
                <th className="px-4 py-3 text-left font-medium">下一步計畫</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sc = STAGE_CONFIG[c.stage];
                const lc = LEVEL_CONFIG[c.level];
                const cp = pct(c.actual2026, c.acv);
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 max-w-32 truncate">{c.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ background: c.amColor }}>{c.amName}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded font-medium"
                            style={{ background:lc?.bg||'#F1F5F9', color:lc?.color||'#64748B' }}>
                        {c.level?.replace(' Account','').replace('Potential','Pot.')||'-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background:sc?.bg||'#F1F5F9', color:sc?.color||'#64748B' }}>
                        {sc?.short||c.stage?.slice(0,8)||'-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{fmtNTD(c.acv)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmtNTD(c.actual2026)}</td>
                    <td className="px-4 py-2.5 text-right font-bold"
                        style={{ color: cp>=100?'#10B981':cp<30?'#EF4444':'#64748B' }}>
                      {fmtPct(cp,0)}
                    </td>
                    <td className="px-4 py-2.5 max-w-36">
                      <span className="text-xs font-medium" style={{ color: c.risk.color }}>
                        {c.risk.label||'—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs">
                      {c.plan || <span className="text-gray-300">—</span>}
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

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700
                       focus:outline-none focus:border-blue-400 bg-white">
      {children}
    </select>
  );
}

function Th({ children, onClick, active, dir, right }) {
  return (
    <th onClick={onClick}
        className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-600
                    ${right?'text-right':'text-left'} ${active?'text-gray-700':''}`}>
      {children}{active ? (dir==='asc'?' ↑':' ↓') : ''}
    </th>
  );
}
