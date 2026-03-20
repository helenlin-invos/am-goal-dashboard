import { useState, useEffect, useCallback } from 'react';
import {
  doc, getDoc, setDoc, collection, addDoc,
  query, orderBy, onSnapshot, deleteDoc,
  getDocs, limit, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { format } from 'date-fns';

// ─── 白名單 ────────────────────────────────────────────────────────────────
const emailKey = (email) => email.toLowerCase().replace(/\./g, '_').replace(/@/g, '__at__');

export async function checkWhitelist(email) {
  // 所有 @invos.com.tw 帳號自動授權
  if (email && email.toLowerCase().endsWith('@invos.com.tw')) return true;
  const snap = await getDoc(doc(db, 'allowed_emails', emailKey(email)));
  return snap.exists();
}
export async function addToWhitelist(email) {
  await setDoc(doc(db, 'allowed_emails', emailKey(email)), { email, addedAt: serverTimestamp() });
}

// ─── 每日快照 ──────────────────────────────────────────────────────────────
// 快照文件 ID = "2026-03-20T08" 或 "2026-03-20T14"（整點 slot）
function slotKey(date = new Date()) {
  const h = date.getHours();
  // 14點後用 T14，否則用 T08（或前一天 T14）
  const slotH = h >= 14 ? 14 : h >= 8 ? 8 : null;
  if (slotH) {
    return `${format(date, 'yyyy-MM-dd')}T${String(slotH).padStart(2,'0')}`;
  }
  // 今天尚未到第一個 slot，用昨天 T14
  const yesterday = new Date(date); yesterday.setDate(date.getDate()-1);
  return `${format(yesterday, 'yyyy-MM-dd')}T14`;
}

export async function saveSnapshot(companies, meta = {}) {
  const key  = slotKey();
  const ref  = doc(db, 'snapshots', key);
  const snap = await getDoc(ref);
  if (snap.exists()) return; // 已存過這個 slot
  await setDoc(ref, {
    slotKey: key,
    savedAt: serverTimestamp(),
    count:   companies.length,
    meta,
    companies: companies.map(c => ({
      id:    c.id,
      name:  c.name,
      oid:   c.ownerId,
      acv:   c.acv,
      a26:   c.actual2026,
      a25:   c.actual2025,
      stage: c.stage,
      level: c.level,
      risk:  c.riskRaw,
    })),
  });
}

export async function loadSnapshot(key) {
  const snap = await getDoc(doc(db, 'snapshots', key));
  return snap.exists() ? snap.data() : null;
}

export async function listSnapshots(n = 60) {
  const q    = query(collection(db, 'snapshots'), orderBy('slotKey', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ key: d.id, ...d.data() }));
}

export async function loadLatestSnapshot() {
  const q    = query(collection(db, 'snapshots'), orderBy('slotKey', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { key: snap.docs[0].id, ...snap.docs[0].data() };
}

// ─── Daily Log ─────────────────────────────────────────────────────────────
export function useDailyLog(dateStr) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dateStr) return;
    const q = query(
      collection(db, 'daily_logs'),
      where('date', '==', dateStr),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [dateStr]);

  const addLog = useCallback(async (entry) => {
    await addDoc(collection(db, 'daily_logs'), { ...entry, date: dateStr, createdAt: serverTimestamp() });
  }, [dateStr]);

  const deleteLog    = useCallback(async (id) => deleteDoc(doc(db, 'daily_logs', id)), []);
  const toggleStar   = useCallback(async (id, cur) =>
    setDoc(doc(db, 'daily_logs', id), { isImportant: !cur }, { merge: true }), []);

  return { logs, loading, addLog, deleteLog, toggleStar };
}
