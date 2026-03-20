import { useState, useCallback, useEffect } from 'react';
import {
  HUBSPOT_API_BASE, COMPANY_FILTERS, COMPANY_PROPERTIES,
  OWNER_MAP, parseRiskLevel, shouldRefresh,
} from '../utils/constants.js';
import { saveSnapshot, loadLatestSnapshot } from './useFirestore.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

const TOKEN = import.meta.env.REACT_APP_HUBSPOT_TOKEN;
const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type':  'application/json',
};

// Fetch all companies matching the AM Goal view filter (paginated)
async function fetchAllCompanies() {
  let all    = [];
  let after  = undefined;
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

    const res  = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/search`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `HubSpot API ${res.status}`);

    all = [...all, ...(json.results || [])];
    if (json.paging?.next?.after) after = json.paging.next.after;
    else break;
  }
  return all;
}

// Normalise raw HubSpot company record → clean object
function normalise(raw) {
  const p   = raw.properties || {};
  const num = (k) => { const v = p[k]; return v ? parseFloat(v) : 0; };
  const oid = p.hubspot_owner_id || '';
  const am  = OWNER_MAP[oid] || null;

  return {
    id:         raw.id,
    name:       p.name || '—',
    ownerId:    oid,
    am:         am,
    amName:     am?.name || '未分配',
    amColor:    am?.color || '#9CA3AF',
    acv:        num('acv'),                              // 2026 ACV Goal
    actual2026: num('ke_hu_jin_nian_du_zong_jin_e'),     // 今年實際
    actual2025: num('qu_nian_du_zong_cheng_jiao_jin_e'), // 去年實際
    stage:      p.inv_clientstage || '',
    level:      p.inv_clientlevel || '',
    riskRaw:    p.inv_client_risk_level || '',
    risk:       parseRiskLevel(p.inv_client_risk_level),
    plan:       (p.inv_developeplan || '').trim(),
  };
}

// ─── 從快照還原成 app 格式 ─────────────────────────────────────────────────
function normaliseFromSnapshot(c) {
  const am = OWNER_MAP[c.oid] || null;
  return {
    id:         c.id,
    name:       c.name || '—',
    ownerId:    c.oid || '',
    am,
    amName:     am?.name || '未分配',
    amColor:    am?.color || '#9CA3AF',
    acv:        c.acv || 0,
    actual2026: c.a26 || 0,
    actual2025: c.a25 || 0,
    stage:      c.stage || '',
    level:      c.level || '',
    riskRaw:    c.risk || '',
    risk:       parseRiskLevel(c.risk),
    plan:       '',
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // 從 Firestore 快照載入（主要資料來源）
  const loadFromFirestore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await loadLatestSnapshot();
      if (snapshot && snapshot.companies && snapshot.companies.length > 0) {
        const data = snapshot.companies.map(normaliseFromSnapshot);
        setCompanies(data);
        const savedAt = snapshot.savedAt?.toDate?.() || null;
        setLastFetch(savedAt);
      } else {
        setError('尚無資料，請等待系統自動同步（每日 08:00 / 14:00）');
      }
    } catch (e) {
      setError('讀取資料失敗：' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 保留 HubSpot 直接 fetch（供未來 server-side 使用）
  const fetchAndSave = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw  = await fetchAllCompanies();
      const data = raw.map(normalise);
      setCompanies(data);
      const now = new Date();
      setLastFetch(now);
      await saveSnapshot(data);
      await setDoc(doc(db, 'meta', 'lastFetch'), {
        time: serverTimestamp(),
        count: data.length,
      });
    } catch (e) {
      // HubSpot 直接呼叫失敗（CORS），改從 Firestore 載入
      await loadFromFirestore();
    } finally {
      setLoading(false);
    }
  }, [loadFromFirestore]);

  // 啟動時：直接從 Firestore 快照載入
  useEffect(() => {
    loadFromFirestore();
  }, [loadFromFirestore]);

  // ─── 衍生統計 ────────────────────────────────────────────────────────────
  const amStats = (() => {
    const map = {};
    companies.forEach(c => {
      const k = c.ownerId || 'unassigned';
      if (!map[k]) map[k] = {
        ...( c.am || { key: 'unassigned', name: c.amName, color: '#9CA3AF', personalQ1: 0 }),
        ownerId:    k,
        acvTotal:   0,
        actual2026: 0,
        actual2025: 0,
        companies:  [],
      };
      map[k].acvTotal   += c.acv;
      map[k].actual2026 += c.actual2026;
      map[k].actual2025 += c.actual2025;
      map[k].companies.push(c);
    });
    return Object.values(map).sort((a,b) => b.acvTotal - a.acvTotal);
  })();

  const teamAcv      = companies.reduce((s, c) => s + c.acv, 0);
  const teamActual26 = companies.reduce((s, c) => s + c.actual2026, 0);
  const teamActual25 = companies.reduce((s, c) => s + c.actual2025, 0);

  const atRiskCount  = companies.filter(c =>
    c.stage.includes('At Risk') || c.stage.includes('Churned')).length;

  return {
    companies, amStats, loading, error, lastFetch,
    teamAcv, teamActual26, teamActual25, atRiskCount,
    refresh: fetchAndSave,
  };
}
