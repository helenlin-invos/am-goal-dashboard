#!/usr/bin/env node
/**
 * sync-hubspot-to-firestore.js
 *
 * GitHub Actions 每日排程執行此腳本：
 *   1. 從 HubSpot 抓取 AM Goal 客戶資料
 *   2. 寫入 Firestore snapshots/{slotKey}
 *
 * 所需環境變數（GitHub Secrets）：
 *   HUBSPOT_TOKEN           - HubSpot Private App Token
 *   FIREBASE_SERVICE_ACCOUNT - Firebase 服務帳號 JSON（字串形式）
 *   FIREBASE_PROJECT_ID     - Firebase Project ID
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── 初始化 Firebase Admin ─────────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── 設定 ──────────────────────────────────────────────────────────────────
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_API   = 'https://api.hubapi.com';

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

// ─── slotKey（配合前端邏輯）─────────────────────────────────────────────────
function slotKey() {
  const now = new Date();
  // 轉換為台灣時間（UTC+8）
  const tst = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const h   = tst.getUTCHours();
  const date = tst.toISOString().slice(0, 10);
  const slotH = h >= 14 ? 14 : h >= 8 ? 8 : null;
  if (slotH) return `${date}T${String(slotH).padStart(2, '0')}`;
  // 今天還未到第一個 slot，用昨天 T14
  const yesterday = new Date(tst); yesterday.setUTCDate(tst.getUTCDate() - 1);
  return `${yesterday.toISOString().slice(0, 10)}T14`;
}

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

    const res  = await fetch(`${HUBSPOT_API}/crm/v3/objects/companies/search`, {
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

// ─── 主程式 ────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 開始同步 HubSpot → Firestore...');

  const companies = await fetchAllCompanies();
  console.log(`✅ 從 HubSpot 抓到 ${companies.length} 筆客戶資料`);

  const key = slotKey();
  const ref = db.collection('snapshots').doc(key);

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

  await ref.set({
    slotKey:   key,
    savedAt:   FieldValue.serverTimestamp(),
    count:     snapshot.length,
    companies: snapshot,
  });

  // 更新 meta/lastFetch
  await db.collection('meta').doc('lastFetch').set({
    time:  FieldValue.serverTimestamp(),
    count: snapshot.length,
  });

  console.log(`✅ 已寫入 Firestore snapshots/${key}（${snapshot.length} 筆）`);
}

main().catch(err => {
  console.error('❌ 同步失敗：', err);
  process.exit(1);
});
