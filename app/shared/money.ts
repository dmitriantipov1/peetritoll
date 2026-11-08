// Деньги храним целым числом в центах, показываем по-эстонски: «5,60 €».

export function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

/** Цена из поля ввода: «5,60», «5.6», «5 €» → 560. Не цена — null. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}
