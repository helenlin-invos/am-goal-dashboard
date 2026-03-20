import React, { useState } from 'react';
import { signOut }   from 'firebase/auth';
import { format }    from 'date-fns';
import { RefreshCw, LogOut } from 'lucide-react';
import { auth }      from '../firebase.js';
import { useCompanies } from '../hooks/useCompanies.js';
import { fmtNTD, fmtPct, pct } from '../utils/formatters.jsx';

import TabOverview    from './tabs/TabOverview.jsx';
import TabAMProgress  from './tabs/TabAMProgress.jsx';
import TabRiskAlerts  from './tabs/TabRiskAlerts.jsx';
import TabClientList  from './tabs/TabClientList.jsx';
import TabYoY         from './tabs/TabYoY.jsx';
import TabHistory     from './tabs/TabHistory.jsx';
import TabInsights    from './tabs/TabInsights.jsx';
import TabDailyLog    from './tabs/TabDailyLog.jsx';
import TabDefinitions from './tabs/TabDefinitions.jsx';

const TABS = [
  { id: 'overview',  label: '📊 總覽'      },
  { id: 'am',        label: '👤 AM 進度'   },
  { id: 'risk',      label: '⚠️ 風險警示'  },
  { id: 'clients',   label: '📋 客戶列表'  },
  { id: 'yoy',       label: '📈 YoY 比較'  },
  { id: 'history',   label: '🕐 歷史紀錄'  },
  { id: 'insights',  label: '🤖 AI 洞察'   },
  { id: 'dailylog',  label: '📝 每日記錄'  },
  { id: 'defs',      label: '📖 名詞定義'  },
];

export default function Dashboard({ user }) {
  const [tab, setTab] = useState('overview');
  const data = useCompanies();
  const { companies, teamAcv, teamActual26, atRiskCount, loading, error, lastFetch, refresh } = data;

  const teamPct = pct(teamActual26, teamAcv);
  const shared  = { ...data, teamPct, user };

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-5">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* Brand */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                   style={{ background: '#1B3A5C' }}>G</div>
              <span className="font-bold text-gray-800 text-sm">AM Goal 2026</span>
            </div>

            {/* KPIs */}
            {!loading && (
              <div className="hidden md:flex items-center gap-5 text-sm">
                <KPIPill label="ACV 目標" value={fmtNTD(teamAcv)} color="#1B3A5C" />
                <KPIPill label="今年實績" value={fmtNTD(teamActual26)}
                         color={teamPct >= 50 ? '#10B981' : '#EF4444'} />
                <KPIPill label="達成率"   value={fmtPct(teamPct)}
                         color={teamPct >= 50 ? '#10B981' : '#EF4444'} />
                <KPIPill label="風險客戶" value={`${atRiskCount} 家`} color="#EF4444" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {lastFetch && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  {format(lastFetch, 'MM/dd HH:mm')}
                </span>
              )}
              <button onClick={refresh} disabled={loading}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                {user.photoURL && (
                  <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                )}
                <span className="text-xs text-gray-600 hidden sm:block max-w-28 truncate">
                  {user.displayName}
                </span>
                <button onClick={() => signOut(auth)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto -mb-px gap-0 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className={`px-3.5 py-3 text-xs whitespace-nowrap transition-colors
                                  ${tab === t.id ? 'tab-active' : 'tab-inactive'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-5 py-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4">
            ⚠️ 資料載入失敗：{error}
            <button onClick={refresh} className="ml-2 underline">重試</button>
          </div>
        )}
        {tab === 'overview' && <TabOverview   {...shared} />}
        {tab === 'am'       && <TabAMProgress {...shared} />}
        {tab === 'risk'     && <TabRiskAlerts {...shared} />}
        {tab === 'clients'  && <TabClientList {...shared} />}
        {tab === 'yoy'      && <TabYoY        {...shared} />}
        {tab === 'history'  && <TabHistory    {...shared} />}
        {tab === 'insights' && <TabInsights   {...shared} />}
        {tab === 'dailylog' && <TabDailyLog   {...shared} />}
        {tab === 'defs'     && <TabDefinitions />}
      </main>
    </div>
  );
}

function KPIPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
