/** Ngày theo Asia/Ho_Chi_Minh */
export function todayISODate(): string {
  return fmtDate(new Date());
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function addDays(iso: string, days: number): string {
  const [y, m, day] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthStart(d = new Date()): string {
  const s = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return `${s.slice(0, 7)}-01`;
}

/** Ngày cuối cùng của tháng chứa `monthStartIso` (YYYY-MM-01). */
export function monthEndDate(monthStartIso: string): string {
  const [yy, mon] = monthStartIso.slice(0, 10).split("-").map(Number);
  const last = new Date(yy, mon, 0).getDate();
  return `${yy}-${String(mon).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function parseVietnameseDateHint(
  raw: string,
  now = new Date()
): { date: string; stripped: string } | null {
  const t = raw.trim();
  const lower = t.toLowerCase();

  if (/^(h[oô]m nay|nay)\b/i.test(lower)) {
    return { date: fmtDate(now), stripped: t.replace(/^(h[oô]m nay|nay)\b/i, "").trim() };
  }
  if (/^(h[oô]m qua|qua)\b/i.test(lower)) {
    const y = fmtDate(now);
    return { date: addDays(y, -1), stripped: t.replace(/^(h[oô]m qua|qua)\b/i, "").trim() };
  }

  const dmY = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmY) {
    const dd = dmY[1].padStart(2, "0");
    const mm = dmY[2].padStart(2, "0");
    const yyyy = dmY[3];
    const stripped = t.replace(dmY[0], " ").replace(/\s+/g, " ").trim();
    return { date: `${yyyy}-${mm}-${dd}`, stripped };
  }

  const dm = t.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  if (dm) {
    const y = Number(fmtDate(now).slice(0, 4));
    const dd = dm[1].padStart(2, "0");
    const mm = dm[2].padStart(2, "0");
    const stripped = t.replace(dm[0], " ").replace(/\s+/g, " ").trim();
    return { date: `${y}-${mm}-${dd}`, stripped };
  }

  return null;
}
