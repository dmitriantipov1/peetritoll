/** Инициалы для кружка-аватара: «Ольга Петрова» → «ОП» */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}
