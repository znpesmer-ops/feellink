/**
 * Takvim haftası: Pazartesi 00:00:00.000 – Pazar 23:59:59.999
 * Sunucunun yerel zamanına göre (Vercel’de genelde UTC); mevcut `new Date()` + `setDate(-N)` ile aynı model.
 * İleride sabit TZ (ör. Europe/Istanbul) istenirse burada merkezi güncellenir.
 */
export function getStartOfWeekMonday(reference: Date = new Date()): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Pazar, 1 = Pazartesi, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function getEndOfWeekSunday(startMonday: Date): Date {
  const end = new Date(startMonday);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getCurrentWeekRange(reference: Date = new Date()): { start: Date; end: Date } {
  const start = getStartOfWeekMonday(reference);
  const end = getEndOfWeekSunday(start);
  return { start, end };
}
