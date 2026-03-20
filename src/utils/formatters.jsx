export const fmtNTD = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `NT$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `NT$${(n/1_000).toFixed(0)}K`;
  return `NT$${n.toLocaleString()}`;
};

export const fmtPct = (v, d=1) => `${(Number(v)||0).toFixed(d)}%`;

export const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
};

export const pct = (a, b) => (!b || b === 0) ? 0 : Math.min(999, (a/b)*100);

export const yoyPct = (curr, prev) => {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
};
