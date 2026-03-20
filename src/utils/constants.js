// ─── AM 設定 ──────────────────────────────────────────────────────────────────
// ownerId = HubSpot Company 的 hubspot_owner_id 欄位
// personalQ1Target = 個人季度業績目標（元），與各客戶 acv 加總的「客群目標」是兩回事
//   Team 個人 Q1 目標加總 = 2900萬；各客戶 acv 加總從 HubSpot 即時計算
// Ethan / Ray 個人 Q1 目標待補，暫填 0

export const AM_LIST = [
  { key: 'helen',  name: 'Helen',  ownerId: '699497618',  personalQ1: 8500000, color: '#1B3A5C' },
  { key: 'yvonne', name: 'Yvonne', ownerId: '1238823096', personalQ1: 6000000, color: '#6366F1' },
  { key: 'megan',  name: 'Megan',  ownerId: '80411630',   personalQ1: 3000000, color: '#8B5CF6' },
  { key: 'ethan',  name: 'Ethan',  ownerId: '159919059',  personalQ1: 0,       color: '#EC4899' },
  { key: 'vicky',  name: 'Vicky',  ownerId: '959579815',  personalQ1: 6000000, color: '#F59E0B' },
  { key: 'andy',   name: 'Andy',   ownerId: '78812708',   personalQ1: 5500000, color: '#10B981' },
  { key: 'ray',    name: 'Ray',    ownerId: '1458325751', personalQ1: 0,       color: '#3B82F6' },
];

export const OWNER_MAP = Object.fromEntries(AM_LIST.map(a => [a.ownerId, a]));

// ─── HubSpot 設定 ─────────────────────────────────────────────────────────────
export const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// 2026 AM Goal View 篩選條件（嚴格對齊 HubSpot view）
// Filter: inv_clientlevel HAS_PROPERTY AND am_guan_li = "true"
export const COMPANY_FILTERS = [
  { propertyName: 'inv_clientlevel', operator: 'HAS_PROPERTY' },
  { propertyName: 'am_guan_li',      operator: 'EQ', value: 'true' },
];

// Company properties to fetch
export const COMPANY_PROPERTIES = [
  'name',
  'hubspot_owner_id',
  'acv',                              // 2026 ACV Goal（各客戶年度目標）
  'ke_hu_jin_nian_du_zong_jin_e',     // 今年度實際成交金額
  'qu_nian_du_zong_cheng_jiao_jin_e', // 去年度成交金額（YoY 比較）
  'inv_clientstage',                  // 客戶階段
  'inv_clientlevel',                  // 客戶等級
  'inv_client_risk_level',            // 客戶風險
  'inv_developeplan',                 // 下一步計畫
  'am_guan_li',
];

// 客戶階段 — 顏色 + 短名
export const STAGE_CONFIG = {
  'Active Customer(活躍客戶)':                { short: 'Active',   color: '#10B981', bg: '#ECFDF5' },
  'Growth / Expansion（成長／擴張中）':        { short: 'Growth',   color: '#3B82F6', bg: '#EFF6FF' },
  'Active Evaluation(積極評估中)':             { short: 'Eval',     color: '#8B5CF6', bg: '#F5F3FF' },
  'Target Account(目標客戶)':                  { short: 'Target',   color: '#64748B', bg: '#F8FAFC' },
  'At Risk（高風險）':                          { short: 'At Risk',  color: '#EF4444', bg: '#FEF2F2' },
  'Churned / Dormant（流失／休眠）':            { short: 'Churned',  color: '#9CA3AF', bg: '#F9FAFB' },
};

// 客戶等級 — 顏色
export const LEVEL_CONFIG = {
  'Top Account':      { color: '#7C3AED', bg: '#F5F3FF' },
  'Key Account':      { color: '#2563EB', bg: '#EFF6FF' },
  'SMB':              { color: '#059669', bg: '#ECFDF5' },
  'Potential Account':{ color: '#D97706', bg: '#FFFBEB' },
};

// 風險等級判斷（從 inv_client_risk_level 文字推斷）
export function parseRiskLevel(riskStr) {
  if (!riskStr) return { level: 'unknown', color: '#9CA3AF', label: '未設定' };
  const s = riskStr.toUpperCase();
  if (s.includes('HIGH') || s.includes('高'))
    return { level: 'high',    color: '#EF4444', label: riskStr };
  if (s.includes('中'))
    return { level: 'medium',  color: '#F59E0B', label: riskStr };
  if (s.includes('健康') || s.includes('LOW') || s.includes('低'))
    return { level: 'low',     color: '#10B981', label: riskStr };
  return { level: 'medium', color: '#F59E0B', label: riskStr };
}

// ─── 自動刷新時間（每日 08:00 / 14:00）─────────────────────────────────────
// 儀表板開啟時判斷：如果上次更新早於最近一個刷新時間點，就重新 fetch 並存快照
export const REFRESH_HOURS = [8, 14];

export function shouldRefresh(lastFetchTime) {
  if (!lastFetchTime) return true;
  const now   = new Date();
  const last  = new Date(lastFetchTime);
  const todaySlots = REFRESH_HOURS.map(h => {
    const d = new Date(now); d.setHours(h, 0, 0, 0); return d;
  });
  // 找到最近一個已過的 slot
  const passedSlots = todaySlots.filter(s => s <= now);
  if (passedSlots.length === 0) {
    // 今天還沒到第一個 slot，看昨天最後的 slot
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(REFRESH_HOURS[REFRESH_HOURS.length - 1], 0, 0, 0);
    return last < yesterday;
  }
  const latestSlot = passedSlots[passedSlots.length - 1];
  return last < latestSlot;
}
