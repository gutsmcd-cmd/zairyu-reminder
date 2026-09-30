/** Days from local today until a YYYY-MM-DD date. Null if blank or invalid. */
export function daysUntil(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [ys, ms, ds] = iso.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const target = new Date(y, m - 1, d);
  if (target.getFullYear() !== y || target.getMonth() !== m - 1 || target.getDate() !== d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export type Level = 'none' | 'ok' | 'soon' | 'urgent' | 'over';

/** Under 90 days = soon, under 30 = urgent. Exactly 90 is still ok; exactly 30 is soon. */
export function level(days: number | null): Level {
  if (days === null) return 'none';
  if (days < 0) return 'over';
  if (days < 30) return 'urgent';
  if (days < 90) return 'soon';
  return 'ok';
}
