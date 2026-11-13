// Публичная страница меню дня: неделя пн–пт и настройки подачи и предзаказа.
// Раздел «Дневное меню» выключен или скрыт на этом языке — страницы нет (null).
// Доступно в серверном коде без импорта.
import type { SiteLunch, SiteLunchItem } from '#shared/site-lunch'
import { addDays, timeInTallinn } from '#shared/dates'
import { pickTranslation, type ContentLocale } from '#shared/locales'

export async function loadSiteLunch(locale: ContentLocale): Promise<SiteLunch | null> {
  const sections = await readSections()
  if (!sections.lunch.enabled || !sections.lunch.locales[locale]) return null

  // Та же неделя, что открывается в админке: текущая, а в выходные — следующая
  const week = await loadLunchWeek(weekParam(undefined))
  const item = (
    texts: { locale: ContentLocale; text: string | null }[],
    cents: number | null,
  ): SiteLunchItem | null => {
    const name = pickTranslation(
      texts.filter((t) => t.text),
      locale,
    )?.text
    return name && cents !== null ? { name, priceCents: cents } : null
  }

  return {
    monday: week.monday,
    today: week.today,
    days: Array.from({ length: 5 }, (_, i) => {
      const date = addDays(week.monday, i)
      const d = week.days.find((x) => x.date === date)
      const texts = (key: 'soup' | 'main') =>
        Object.entries(d?.translations ?? {}).map(([l, t]) => ({
          locale: l as ContentLocale,
          text: t?.[key] ?? null,
        }))
      return {
        date,
        soup: d ? item(texts('soup'), d.soupCents) : null,
        main: d ? item(texts('main'), d.mainCents) : null,
      }
    }),
    servedFrom: week.settings.servedFrom,
    servedTo: week.settings.servedTo,
    acceptPreorders: week.settings.acceptPreorders,
    preorderUntil: week.settings.preorderUntil,
    now: timeInTallinn(),
  }
}
