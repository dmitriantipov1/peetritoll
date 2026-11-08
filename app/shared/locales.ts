// Языки содержимого: те же, что у сайта (nuxt.config.ts → i18n.locales).
// Тексты из базы (меню, новости, товары) хранятся в таблицах переводов «*_translations»:
// одна строка на язык. Чего нет — показываем по правилу pickTranslation.
export const contentLocales = ['et', 'en', 'ru'] as const
export type ContentLocale = (typeof contentLocales)[number]

export const defaultContentLocale: ContentLocale = 'et'

export function isContentLocale(value: unknown): value is ContentLocale {
  return typeof value === 'string' && (contentLocales as readonly string[]).includes(value)
}

/**
 * Перевод для языка страницы. Если его нет — эстонский (5.5 в требованиях),
 * если нет и эстонского — любой имеющийся, чтобы не показывать пустое место.
 */
export function pickTranslation<T extends { locale: string }>(
  rows: readonly T[],
  locale: string,
): T | undefined {
  return (
    rows.find((row) => row.locale === locale) ??
    rows.find((row) => row.locale === defaultContentLocale) ??
    rows[0]
  )
}
