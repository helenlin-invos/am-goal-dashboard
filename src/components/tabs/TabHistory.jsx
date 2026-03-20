import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Calendar } from 'lucide-react';
import { listSnapshots, loadSnapshot } from '../../hooks/useFirestore.js';
import { fmtNTD, fmtPct, pct } from '../../utils/formatters.jsx';
import { AM_LIST } from '../../utils/constants.js';

export default function TabHistory() {
  const [snapshots, setSnapshots] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [detail,    setDetail]    = useState(null);
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    listSnapshots(60).then(snaps => { setSnapshots(snaps); setLoadingList(false); });
  }, []);

  const openDetail = async (key) => {
    setSelected(key); setLoadingDetail(true);
    setDetail(await loadSnapshot(key));
    setLoadingDetail(false);
  };

  // Build trend data from snapshots (up to 30 most recent, reversed for chart)
  const trendData = [...snapshots]
    .slice(0, 30).reverse()
    .map(s => {
      const row = { slot: s.key?.slice(5) }; // "03-20T08"
      const total = (s.companies||[]).reduce((sum,c)=>sum+c.a26,0);
      const acv   = (s.companies||[]).reduce((sum,c)=>sum+c.acv,0);
      row['達成率'] = acv>0 ? Math.round((total/acv)*100) : 0;
      AM_LIST.forEach(am => {
        const myC = (s.companies||[]).filter(c=>c.oid===am.ownerId);
        const myActual = myC.reduce((s,c)=>s+c.a26,0);
        const myAcv    = myC.reduce((s,c)=>s+c.acv,0);
        row[am.name] = myAcv>0 ? Math.round((myActual/myAcv)*100) : 0;
      });
      return row;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left: snapshot list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            <Calendar size={15} /> 歷史快照
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">每日 08:00 / 14:00 自動儲存</p>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
          {loadingList ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[...Array(6)].map((_,i)=><div key={i} className="h-10 bg-gray-50 rounded" />)}
            </div>
          ) : snapshots.length === 0 ? (
            <p className="text-gray-400 text-sm p-6 text-center">
              尚無歷史紀錄<br />
              <span className="text-xs">儀表板每日 08:00 / 14:00 自動存入</span>
            </p>
          ) : snapshots.map(s => {
            const total = (s.companies||[]).reduce((sum,c)=>sum+c.a26,0);
            const acv   = (s.companies||[]).reduce((sum,c)=>sum+c.acv,0);
            const p     = acv>0 ? Math.round((total/acv)*100) : 0;
            return (
              <button key={s.key} onClick={()=>openDetail(s.key)}
                      className={`w-full text-left px-5 py-3 flex items-center justify-between
                                  hover:bg-gray-50 border-b border-gray-50 transition-colors
                                  ${selected===s.key?'bg-blue-50':''}`}>
                <div>
                  <p className="text-xs font-medium text-gray-800">{s.key}</p>
                  <p className="text-xs text-gray-400">{s.count} 家客戶 · {fmtNTD(total)}</p>
                </div>
                <p className="text-sm font-bold" style={{ color: p>=50?'#10B981':'#EF4444' }}>{p}%</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: trend + detail */}
      <div className="lg:col-span-2 space-y-5">
        {trendData.length >= 2 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 text-sm mb-4">達成率趨勢</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis dataKey="slot" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v=>`${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v,n)=>[`${v}%`,n]} />
                <Legend />
                <Line dataKey="達成率" stroke="#1B3A5C" strokeWidth={2.5} dot={false} />
                {AM_LIST.map(am => (
                  <Line key={am.key} dataKey={am.name} stroke={am.color}
                        strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selected && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 text-sm mb-4">📅 {selected} 快照</h2>
            {loadingDetail ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(5)].map((_,i)=><div key={i} className="h-8 bg-gray-50 rounded" />)}
              </div>
            ) : detail ? (
              <div className="space-y-4">
                {/* AM summary from snapshot */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="py-2 text-left font-medium">AM</th>
                      <th className="py-2 text-right font-medium">ACV 目標</th>
                      <th className="py-2 text-right font-medium">實績</th>
                      <th className="py-2 text-right font-medium">達成率</th>
                      <th className="py-2 text-right font-medium">客戶數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AM_LIST.map(am => {
                      const myC    = (detail.companies||[]).filter(c=>c.oid===am.ownerId);
                      const myAcv  = myC.reduce((s,c)=>s+c.acv,0);
                      const myA26  = myC.reduce((s,c)=>s+c.a26,0);
                      if (myC.length === 0) return null;
                      const cp = pct(myA26, myAcv);
                      return (
                        <tr key={am.key} className="border-b border-gray-50">
                          <td className="py-2">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: am.color }} />
                              <span className="font-medium text-gray-700">{am.name}</span>
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-400">{fmtNTD(myAcv)}</td>
                          <td className="py-2 text-right font-medium">{fmtNTD(myA26)}</td>
                          <td className="py-2 text-right font-bold"
                              style={{ color: cp>=100?'#10B981':cp<30?'#EF4444':'#64748B' }}>
                            {fmtPct(cp,0)}
                          </td>
                          <td className="py-2 text-right text-gray-400">{myC.length}</td>
                        </tr>
                      );
                    }).filter(Boolean)}
                    <tr className="border-t-2 border-gray-200 font-bold">
                      <td className="py-2 text-gray-800">合計</td>
                      <td className="py-2 text-right">{fmtNTD((detail.companies||[]).reduce((s,c)=>s+c.acv,0))}</td>
                      <td className="py-2 text-right">{fmtNTD((detail.companies||[]).reduce((s,c)=>s+c.a26,0))}</td>
                      <td className="py-2 text-right text-blue-600">
                        {fmtPct(pct(
                          (detail.companies||[]).reduce((s,c)=>s+c.a26,0),
                          (detail.companies||[]).reduce((s,c)=>s+c.acv,0)
                        ),0)}
                      </td>
                      <td className="py-2 text-right text-gray-400">{(detail.companies||[]).length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <p className="text-gray-400 text-sm">無法載入此快照</p>}
          </div>
        )}

        {!selected && trendData.length < 2 && (
          <div className="card p-10 text-center">
            <Calendar size={28} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">歷史資料累積中</p>
            <p className="text-xs text-gray-300 mt-1">儀表板每日 08:00 / 14:00 自動存入快照</p>
          </div>
        )}
      </div>
    </div>
  );
}
