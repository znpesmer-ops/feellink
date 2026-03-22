/** Türkçe TL gösterimi: 1250 → "1.250 TL" */
export function formatTry(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return ''
  const rounded = Math.round(amount)
  return `${new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(rounded)} TL`
}
