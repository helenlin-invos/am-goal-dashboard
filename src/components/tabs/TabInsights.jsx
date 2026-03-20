import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { fmtNTD, fmtPct, pct } from '../../utils/formatters.jsx';

const KEY = import.meta.env.REACT_APP_ANTHROPIC_KEY;

const TYPES = [
  { id: 'health',   label: '🏥 客群健診',     desc: '整體客戶健康度、風險分布、優先行動' },
  { id: 'risk',     label: '🚨 風險客戶分析',  desc: 'At Risk / Churned 客戶挽留策略' },
  { id: 'am',       label: '👤 AM 達成分析',   desc: '各 AM 進度差異、個別建議' },
  { id: 'yoy',      label: '📈 YoY 洞察',      desc: '今年 vs 去年，成長 / 流失原因推斷' },
  { id: 'nextStep', label: '🎯 下步行動計劃',   desc: 'Helen 本週最高優先 action items' },
];

export default function TabInsights({ companies, amStats, teamAcv, teamActual26, teamActual25 }) {
  const [type,       setType]       = useState('health');
  const [generating, setGenerating] = useState(false);
  const [result,     setResult]     = useState('');
  const [error,      setError]      = useState('');
  const [doneType,   setDoneType]   = useState('');

  const buildContext = () => {
    const atRisk  = companies.filter(c=>c.stage.includes('At Risk'));
    const churned = companies.filter(c=>c.stage.includes('Churned'));
    const highRisk = companies.filter(c=>c.risk.level==='high');
    const teamPct  = pct(teamActual26, teamAcv);
    const teamYoY  = teamActual25 > 0 ? ((teamActual26-teamActual25)/teamActual25)*100 : null;

    const amSummary = amStats.filter(a=>a.acvTotal>0).map(a => {
      const cp  = pct(a.actual2026, a.acvTotal);
      const yoy = a.actual2025>0 ? ((a.actual2026-a.actual2025)/a.actual2025)*100 : null;
      return `- ${a.name}：ACV目標 ${fmtNTD(a.acvTotal)} / 今年 ${fmtNTD(a.actual2026)} (${fmtPct(cp,0)})${yoy!==null?' / YoY '+fmtPct(yoy,0):''}`;
    }).join('\n');

    const riskSummary = [...atRisk,...churned].slice(0,15).map(c =>
      `- ${c.name}（${c.amName}）：${c.stage.includes('At Risk')?'At Risk':'Churned'}，ACV ${fmtNTD(c.acv)}，風險：${c.riskRaw}，計畫：${c.plan||'未填'}`)
      .join('\n');

    return `【今日數據 ${new Date().toLocaleDateString('zh-TW')}】
公司：invos（台灣數據行銷公司）
全隊 ACV 目標：${fmtNTD(teamAcv)}（${companies.length} 家客戶）
今年實績：${fmtNTD(teamActual26)}（達成率 ${fmtPct(teamPct,1)}）
去年實績：${fmtNTD(teamActual25)}${teamYoY!==null?' / YoY '+fmtPct(teamYoY,1):''}

各 AM 狀況：
${amSummary}

風險客戶（At Risk: ${atRisk.length} 家 / Churned: ${churned.length} 家 / HIGH 風險: ${highRisk.length} 家）：
${riskSummary||'（無）'}`.trim();
  };

  const PROMPTS = {
    health:   ctx => `${ctx}\n\n你是 invos 的業績顧問。請提供整體客群健診：\n1. 三句話定調現況（直接說問題）\n2. 最高風險的 3 個信號（附數字）\n3. 客戶等級/階段分布有無異常\n4. 本週必須採取的前三個行動\n\n繁體中文，語氣直接，數字具體。`,
    risk:     ctx => `${ctx}\n\n請針對 At Risk 和 Churned 客戶提供挽留策略：\n1. 依嚴重程度分類（可挽留 vs 難挽留）\n2. 前 5 家最值得投入資源的客戶，各自挽留方向\n3. Helen 本週應親自介入的客戶名單與理由\n4. 若放棄哪些客戶，對 ACV 達成的影響\n\n繁體中文，格式清晰，每家客戶獨立條列。`,
    am:       ctx => `${ctx}\n\n請分析各 AM 達成狀況：\n\n[AM 姓名]\n• 現況一句話定性\n• 主要問題：（1-2點）\n• 具體建議：（2-3個可執行動作）\n• Helen 對這位 AM 的本週 coaching 重點\n\n繁體中文，像主管週報的口吻。`,
    yoy:      ctx => `${ctx}\n\n請分析 YoY 成長趨勢：\n1. 整體 YoY 是成長還是衰退？主因推斷\n2. 哪些客戶今年顯著成長？可能原因\n3. 哪些客戶今年流失/縮減？風險點\n4. 哪個 AM 的客群 YoY 表現最值得學習？\n5. 針對 YoY 衰退客戶，下步策略建議\n\n繁體中文，數字具體。`,
    nextStep: ctx => `${ctx}\n\nHelen 作為 Sales Manager，請給她本週最重要的行動計劃：\n\n## 本週必做（Top 5 Actions）\n（依影響力排序，每項附具體客戶名/AM名/時間）\n\n## 需要 Helen 親自介入的客戶\n（附理由和建議切入角度）\n\n## AM Coaching 重點\n（哪位 AM 本週需要特別關注，重點是什麼）\n\n## 本週成功指標\n（具體數字：哪些客戶應在本週確認/簽約/推進）\n\n繁體中文，像寫給自己的作戰計劃，直接可執行。`,
  };

  const generate = async () => {
    if (!KEY) { setError('請在 .env 設定 REACT_APP_ANTHROPIC_KEY'); return; }
    setGenerating(true); setResult(''); setError(''); setDoneType(type);

    try {
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-api-key':     KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1800,
          messages:   [{ role: 'user', content: PROMPTS[type](buildContext()) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `API ${res.status}`);
      setResult(data.content?.[0]?.text || '');
    } catch (e) { setError('生成失敗：' + e.message); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#EFF6FF' }}>
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-sm">AI 業績洞察</h2>
            <p className="text-xs text-gray-400 mt-0.5">根據 HubSpot 即時 Company 資料（ACV、今年/去年實績、客戶階段）自動生成</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          {TYPES.map(t => (
            <button key={t.id} onClick={()=>setType(t.id)}
                    className={`text-left p-3 rounded-xl border-2 transition-all
                                ${type===t.id?'border-blue-500 bg-blue-50':'border-gray-100 hover:border-gray-200'}`}>
              <p className="font-medium text-gray-800 text-xs mb-0.5">{t.label}</p>
              <p className="text-gray-400 text-xs leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>

        <button onClick={generate} disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ background: '#2563EB' }}>
          {generating
            ? <><RefreshCw size={15} className="animate-spin" />分析中...</>
            : <><Sparkles size={15} />生成洞察</>}
        </button>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {result && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
            <span className="font-semibold text-gray-700 text-sm">
              {TYPES.find(t=>t.id===doneType)?.label}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{new Date().toLocaleString('zh-TW')}</span>
          </div>
          <div className="text-sm space-y-1">
            {result.split('\n').map((line, i) => {
              if (line.startsWith('## ') || line.startsWith('# '))
                return <p key={i} className="font-bold text-gray-800 text-base mt-5 mb-1 first:mt-0">{line.replace(/^#+\s/,'')}</p>;
              if (line.match(/^\d\./) || line.match(/^[•\-]\s/))
                return <p key={i} className="text-gray-700 ml-4 my-1">{line}</p>;
              if (line.startsWith('[') && line.endsWith(']'))
                return <p key={i} className="font-bold text-gray-800 mt-4 mb-1">{line}</p>;
              return line
                ? <p key={i} className="text-gray-600">{line}</p>
                : <div key={i} className="h-2" />;
            })}
          </div>
        </div>
      )}

      {!result && !error && !generating && (
        <div className="card p-10 text-center">
          <Sparkles size={28} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">選擇分析類型後點擊「生成洞察」</p>
        </div>
      )}
    </div>
  );
}
