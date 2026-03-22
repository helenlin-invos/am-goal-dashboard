#!/usr/bin/env node
/**
 * sync-hubspot-to-firestore.js
 *
 * GitHub Actions 每日排程執行此腳本：
 *   1. 從 HubSpot 抓取 AM Goal 客戶資料
 *   2. 呼叫 Claude API 生成 5 種 AI 分析
 *   3. 將資料 + AI 分析寫入 Firestore
 *
 * 所需環境變數（GitHub Secrets）：
 *   HUBSPOT_TOKEN            - HubSpot Private App Token
 *   FIREBASE_SERVICE_ACCOUNT - Firebase 服務帳號 JSON（字串形式）
 *   FIREBASE_PROJECT_ID      - Firebase Project ID
 *   GEMINI_API_KEY           - Google Gemini API Key（AI 分析用，免費方案）
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── 初始化 Firebase Admin ─────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── 設定 ──────────────────────────────────────────────────────────────────
const HUBSPOT_TOKEN    = process.env.HUBSPOT_TOKEN;
const GEMINI_KEY       = process.env.GEMINI_API_KEY;
const HUBSPOT_API      = 'https://api.hubapi.com';

const COMPANY_FILTERS = [
  { propertyName: 'inv_clientlevel', operator: 'HAS_PROPERTY' },
  { propertyName: 'am_guan_li',      operator: 'EQ', value: 'true' },
];

const COMPANY_PROPERTIES = [
  'name', 'hubspot_owner_id', 'acv',
  'ke_hu_jin_nian_du_zong_jin_e',
  'qu_nian_du_zong_cheng_jiao_jin_e',
  'inv_clientstage', 'inv_clientlevel',
  'inv_client_risk_level', 'inv_developeplan', 'am_guan_li',
];

// AM 對應表（與前端同步）
const AM_LIST = [
  { key: 'helen',  name: 'Helen',  ownerId: '699497618'  },
  { key: 'yvonne', name: 'Yvonne', ownerId: '1238823096' },
  { key: 'megan',  name: 'Megan',  ownerId: '80411630'   },
  { key: 'ethan',  name: 'Ethan',  ownerId: '159919059'  },
  { key: 'vicky',  name: 'Vicky',  ownerId: '959579815'  },
  { key: 'andy',   name: 'Andy',   ownerId: '78812708'   },
  { key: 'ray',    name: 'Ray',    ownerId: '1458325751' },
];
const OWNER_MAP = Object.fromEntries(AM_LIST.map(a => [a.ownerId, a]));

// ─── slotKey ───────────────────────────────────────────────────────────────
function slotKey() {
  const now = new Date();
  const tst = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const h   = tst.getUTCHours();
  const date = tst.toISOString().slice(0, 10);
  const slotH = h >= 14 ? 14 : h >= 8 ? 8 : null;
  if (slotH) return `${date}T${String(slotH).padStart(2, '0')}`;
  const yesterday = new Date(tst); yesterday.setUTCDate(tst.getUTCDate() - 1);
  return `${yesterday.toISOString().slice(0, 10)}T14`;
}

// ─── 金額格式化 ────────────────────────────────────────────────────────────
function fmtNTD(n) {
  if (n >= 1e8) return `NT$${(n / 1e8).toFixed(1)}億`;
  if (n >= 1e4) return `NT$${Math.round(n / 1e4)}萬`;
  return `NT$${n.toLocaleString()}`;
}
function fmtPct(n) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }

// ─── 抓取 HubSpot 資料（分頁）─────────────────────────────────────────────
async function fetchAllCompanies() {
  const all = [];
  let after = undefined;
  let safety = 0;

  while (safety < 20) {
    safety++;
    const body = {
      filterGroups: [{ filters: COMPANY_FILTERS }],
      properties:   COMPANY_PROPERTIES,
      limit:        100,
      sorts:        [{ propertyName: 'name', direction: 'ASCENDING' }],
      ...(after ? { after } : {}),
    };

    const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/companies/search`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HubSpot API ${res.status}: ${txt}`);
    }

    const json = await res.json();
    all.push(...(json.results || []));
    if (json.paging?.next?.after) after = json.paging.next.after;
    else break;
  }
  return all;
}

// ─── 建立 AI 分析的 context 文字 ───────────────────────────────────────────
function buildContext(companies) {
  const num = (p, k) => { const v = p[k]; return v ? parseFloat(v) : 0; };

  const parsed = companies.map(raw => {
    const p = raw.properties || {};
    const ownerId = p.hubspot_owner_id || '';
    const am = OWNER_MAP[ownerId];
    return {
      name:     p.name || '—',
      amName:   am?.name || '未分配',
      ownerId,
      acv:      num(p, 'acv'),
      a26:      num(p, 'ke_hu_jin_nian_du_zong_jin_e'),
      a25:      num(p, 'qu_nian_du_zong_cheng_jiao_jin_e'),
      stage:    p.inv_clientstage || '',
      level:    p.inv_clientlevel || '',
      risk:     p.inv_client_risk_level || '',
    };
  });

  const teamAcv = parsed.reduce((s, c) => s + c.acv, 0);
  const teamA26 = parsed.reduce((s, c) => s + c.a26, 0);
  const teamA25 = parsed.reduce((s, c) => s + c.a25, 0);
  const teamPct = teamAcv > 0 ? (teamA26 / teamAcv) * 100 : 0;
  const teamYoY = teamA25 > 0 ? ((teamA26 - teamA25) / teamA25) * 100 : null;

  const atRisk  = parsed.filter(c => c.stage.includes('At Risk'));
  const churned = parsed.filter(c => c.stage.includes('Churned'));
  const highRisk = parsed.filter(c => c.risk.toUpperCase().includes('HIGH') || c.risk.includes('高'));

  // 各 AM 統計
  const amMap = {};
  parsed.forEach(c => {
    const k = c.ownerId || 'unassigned';
    if (!amMap[k]) amMap[k] = { name: c.amName, acv: 0, a26: 0, a25: 0, companies: [] };
    amMap[k].acv += c.acv;
    amMap[k].a26 += c.a26;
    amMap[k].a25 += c.a25;
    amMap[k].companies.push(c);
  });

  const amSummary = Object.values(amMap)
    .filter(a => a.acv > 0)
    .sort((a, b) => b.acv - a.acv)
    .map(a => {
      const pct = a.acv > 0 ? (a.a26 / a.acv * 100).toFixed(1) : '0.0';
      const yoy = a.a25 > 0 ? fmtPct((a.a26 - a.a25) / a.a25 * 100) : '無去年資料';
      return `- ${a.name}：ACV目標 ${fmtNTD(a.acv)} / 今年實績 ${fmtNTD(a.a26)} (達成率 ${pct}%) / YoY ${yoy}`;
    }).join('\n');

  const riskSummary = [...atRisk, ...churned].slice(0, 20)
    .map(c => `- ${c.name}（${c.amName}）：${c.stage.includes('At Risk') ? 'At Risk' : 'Churned'}，ACV ${fmtNTD(c.acv)}，風險：${c.risk || '未設定'}`)
    .join('\n');

  return `【數據日期：${new Date().toLocaleDateString('zh-TW')}】
公司：invos（台灣數據行銷公司）
客戶總數：${parsed.length} 家
全隊 ACV 目標：${fmtNTD(teamAcv)}
今年實績：${fmtNTD(teamA26)}（達成率 ${teamPct.toFixed(1)}%）
去年實績：${fmtNTD(teamA25)}${teamYoY !== null ? `（YoY ${fmtPct(teamYoY)}）` : ''}

各 AM 達成狀況：
${amSummary}

風險客戶（At Risk: ${atRisk.length} 家 / Churned: ${churned.length} 家 / 高風險: ${highRisk.length} 家）：
${riskSummary || '（無）'}`;
}

// ─── 呼叫 Claude API 生成分析 ──────────────────────────────────────────────
const PROMPTS = {
  health:   ctx => `${ctx}\n\n你是 invos 的業績顧問。請提供整體客群健診：\n1. 三句話定調現況（直接說問題）\n2. 最高風險的 3 個信號（附數字）\n3. 客戶等級/階段分布有無異常\n4. 本週必須採取的前三個行動\n\n繁體中文，語氣直接，數字具體。`,
  risk:     ctx => `${ctx}\n\n請針對 At Risk 和 Churned 客戶提供挽留策略：\n1. 依嚴重程度分類（可挽留 vs 難挽留）\n2. 前 5 家最值得投入資源的客戶，各自挽留方向\n3. Helen 本週應親自介入的客戶名單與理由\n4. 若放棄哪些客戶，對 ACV 達成的影響\n\n繁體中文，格式清晰，每家客戶獨立條列。`,
  am:       ctx => `${ctx}\n\n請分析各 AM 達成狀況：\n\n[AM 姓名]\n• 現況一句話定性\n• 主要問題：（1-2點）\n• 具體建議：（2-3個可執行動作）\n• Helen 對這位 AM 的本週 coaching 重點\n\n繁體中文，像主管週報的口吻。`,
  yoy:      ctx => `${ctx}\n\n請分析 YoY 成長趨勢：\n1. 整體 YoY 是成長還是衰退？主因推斷\n2. 哪些客戶今年顯著成長？可能原因\n3. 哪些客戶今年流失/縮減？風險點\n4. 哪個 AM 的客群 YoY 表現最值得學習？\n5. 針對 YoY 衰退客戶，下步策略建議\n\n繁體中文，數字具體。`,
  nextStep: ctx => `${ctx}\n\nHelen 作為 Sales Manager，請給她本週最重要的行動計劃：\n\n## 本週必做（Top 5 Actions）\n（依影響力排序，每項附具體客戶名/AM名/時間）\n\n## 需要 Helen 親自介入的客戶\n（附理由和建議切入角度）\n\n## AM Coaching 重點\n（哪位 AM 本週需要特別關注，重點是什麼）\n\n## 本週成功指標\n（具體數字：哪些客戶應在本週確認/簽約/推進）\n\n繁體中文，像寫給自己的作戰計劃，直接可執行。`,
};

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── 主程式 ────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 開始同步 HubSpot → Firestore...');

  // 1. 抓 HubSpot 資料
  const companies = await fetchAllCompanies();
  console.log(`✅ 從 HubSpot 抓到 ${companies.length} 筆客戶資料`);

  // 2. 整理快照資料
  const key = slotKey();
  const snapshot = companies.map(raw => {
    const p   = raw.properties || {};
    const num = k => { const v = p[k]; return v ? parseFloat(v) : 0; };
    return {
      id:    raw.id,
      name:  p.name || '—',
      oid:   p.hubspot_owner_id || '',
      acv:   num('acv'),
      a26:   num('ke_hu_jin_nian_du_zong_jin_e'),
      a25:   num('qu_nian_du_zong_cheng_jiao_jin_e'),
      stage: p.inv_clientstage || '',
      level: p.inv_clientlevel || '',
      risk:  p.inv_client_risk_level || '',
    };
  });

  // 3. 呼叫 Claude 生成 5 種分析（若無 key 則跳過）
  let insights = null;
  if (GEMINI_KEY) {
    console.log('🤖 開始生成 AI 分析（Gemini）...');
    const ctx = buildContext(companies);
    const types = ['health', 'risk', 'am', 'yoy', 'nextStep'];
    insights = {};

    for (const type of types) {
      try {
        console.log(`  → 生成 ${type} 分析...`);
        insights[type] = await callGemini(PROMPTS[type](ctx));
        console.log(`  ✅ ${type} 完成`);
      } catch (e) {
        console.error(`  ⚠️ ${type} 生成失敗：${e.message}`);
        insights[type] = null;
      }
    }
    console.log('✅ AI 分析全部完成');
  } else {
    console.log('⚠️ 未設定 GEMINI_API_KEY，跳過 AI 分析');
  }

  // 4. 寫入 Firestore snapshots
  await db.collection('snapshots').doc(key).set({
    slotKey:   key,
    savedAt:   FieldValue.serverTimestamp(),
    count:     snapshot.length,
    companies: snapshot,
  });

  // 5. 寫入 Firestore insights（若有）
  if (insights) {
    await db.collection('insights').doc(key).set({
      slotKey:     key,
      generatedAt: FieldValue.serverTimestamp(),
      ...insights,
    });
    console.log(`✅ 已寫入 Firestore insights/${key}`);
  }

  // 6. 更新 meta
  await db.collection('meta').doc('lastFetch').set({
    time:  FieldValue.serverTimestamp(),
    count: snapshot.length,
    hasInsights: !!insights,
  });

  console.log(`✅ 已寫入 Firestore snapshots/${key}（${snapshot.length} 筆）`);
}

main().catch(err => {
  console.error('❌ 同步失敗：', err);
  process.exit(1);
});
