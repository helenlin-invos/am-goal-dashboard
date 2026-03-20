import React, { useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { PlusCircle, Trash2, Star, StarOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDailyLog } from '../../hooks/useFirestore.js';
import { AM_LIST } from '../../utils/constants.js';

const LOG_TYPES = [
  { value:'visit',    label:'🤝 客戶拜訪' },
  { value:'followup', label:'📞 跟進電話' },
  { value:'proposal', label:'📄 提案送出' },
  { value:'win',      label:'🎉 成交'     },
  { value:'risk',     label:'⚠️ 客戶風險' },
  { value:'note',     label:'📝 備忘'     },
];

export default function TabDailyLog({ user }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateStr,  setDateStr]  = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [amFilter, setAmFilter] = useState('all');

  const { logs, loading, addLog, deleteLog, toggleStar } = useDailyLog(dateStr);
  const isToday = dateStr === today;

  const nav = (d) => {
    const dt = new Date(dateStr); dt.setDate(dt.getDate()+d);
    setDateStr(format(dt, 'yyyy-MM-dd'));
  };

  const filtered = amFilter==='all' ? logs : logs.filter(l=>l.amKey===amFilter);

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="card p-4 flex items-center justify-between">
        <button onClick={()=>nav(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-sm">
            {dateStr}
            {isToday && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">今天</span>}
          </p>
          <p className="text-xs text-gray-400">{logs.length} 筆記錄</p>
        </div>
        <button onClick={()=>nav(1)} disabled={isToday}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filters + Add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Pill active={amFilter==='all'} onClick={()=>setAmFilter('all')}>全部</Pill>
          {AM_LIST.map(am=>(
            <Pill key={am.key} active={amFilter===am.key} onClick={()=>setAmFilter(am.key)} color={am.color}>
              {am.name}
            </Pill>
          ))}
        </div>
        {isToday && (
          <button onClick={()=>setShowForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background:'#2563EB' }}>
            <PlusCircle size={15} />新增記錄
          </button>
        )}
      </div>

      {showForm && (
        <LogForm user={user} onSave={async e=>{await addLog(e);setShowForm(false);}}
                 onCancel={()=>setShowForm(false)} />
      )}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_,i)=><div key={i} className="card h-16 bg-gray-50" />)}
        </div>
      ) : filtered.length===0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-400 text-sm">這天尚無記錄</p>
          {isToday && <button onClick={()=>setShowForm(true)} className="mt-2 text-xs text-blue-500 hover:underline">+ 新增</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log=>(
            <LogCard key={log.id} log={log}
                     onDelete={()=>deleteLog(log.id)}
                     onToggleStar={()=>toggleStar(log.id, log.isImportant)}
                     canEdit={log.authorEmail===user.email} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogForm({ user, onSave, onCancel }) {
  const [f, setF] = useState({ amKey: AM_LIST[0].key, type:'visit', client:'', content:'' });
  const S = (k,v) => setF(prev=>({...prev,[k]:v}));
  const save = async () => {
    if (!f.content.trim()) return;
    const am = AM_LIST.find(a=>a.key===f.amKey);
    await onSave({ ...f, amName: am?.name||f.amKey, authorEmail: user.email, authorName: user.displayName, isImportant: false });
  };
  return (
    <div className="card p-5 border-2 border-blue-100">
      <h3 className="font-semibold text-gray-700 text-sm mb-4">新增記錄</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">AM</label>
          <select value={f.amKey} onChange={e=>S('amKey',e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400">
            {AM_LIST.map(a=><option key={a.key} value={a.key}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">類型</label>
          <select value={f.type} onChange={e=>S('type',e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400">
            {LOG_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <input value={f.client} onChange={e=>S('client',e.target.value)} placeholder="客戶名稱（選填）"
             className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-blue-400" />
      <textarea value={f.content} onChange={e=>S('content',e.target.value)} rows={3}
                placeholder="記錄內容：拜訪重點、決策者回饋、下步行動..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none mb-4 focus:outline-none focus:border-blue-400" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100">取消</button>
        <button onClick={save} disabled={!f.content.trim()}
                className="px-4 py-2 rounded-lg text-xs text-white disabled:opacity-40"
                style={{ background:'#2563EB' }}>儲存</button>
      </div>
    </div>
  );
}

function LogCard({ log, onDelete, onToggleStar, canEdit }) {
  const t  = LOG_TYPES.find(t=>t.value===log.type)||LOG_TYPES[5];
  const am = AM_LIST.find(a=>a.key===log.amKey);
  return (
    <div className={`card p-4 ${log.isImportant?'border-l-4 border-yellow-400':''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{t.label.split(' ')[0]}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ background: am?.color||'#64748B' }}>{log.amName}</span>
              <span className="text-xs text-gray-400">{t.label.split(' ').slice(1).join(' ')}</span>
              {log.client && <span className="text-xs text-gray-500 font-medium">· {log.client}</span>}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.content}</p>
            <p className="text-xs text-gray-300 mt-1">
              {log.authorName} · {log.createdAt?.toDate?.()?.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})||''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleStar} className="p-1.5 rounded-lg hover:bg-gray-100">
            {log.isImportant
              ? <Star size={15} className="text-yellow-400 fill-yellow-400" />
              : <StarOff size={15} className="text-gray-300" />}
          </button>
          {canEdit && (
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ active, onClick, color, children }) {
  return (
    <button onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                        ${active?'text-white':'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}
            style={active?{background:color||'#2563EB'}:{}}>
      {children}
    </button>
  );
}
