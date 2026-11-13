// Публичная страница группового меню: обеды «на сайте» и правила запроса группы.
// Раздел «Групповое меню» выключен или скрыт на этом языке — страницы нет (null).
// Доступно в серверном коде без импорта.
import type { SiteGroup } from '#shared/site-group'
import { menuItemLines } from '#shared/group-menus'
import { pickTranslation, type ContentLocale } from '#shared/locales'

export async function loadSiteGroup(locale: ContentLocale): Promise<SiteGroup | null> {
  const sections = await readSections()
  if (!sections.group.enabled || !sections.group.locales[locale]) return null

  const { menus, settings } = await loadGroupMenus()
  return {
    menus: menus
      .filter((m) => m.isVisible)
      .map((m) => {
        const rows = (key: 'names' | 'items') =>
          Object.entries(m[key]).map(([l, text]) => ({ locale: l, text: text ?? '' }))
        return {
          id: m.id,
          number: m.number,
          // Перевода названия нет — эстонское, иначе любое; состав — на том же языке, что нашёлся
          name: pickTranslation(rows('names'), locale)?.text ?? '',
          items: menuItemLines(pickTranslation(rows('items'), locale)?.text),
          priceCents: m.priceCents,
        }
      }),
    minPeople: settings.minPeople,
    leadHours: settings.leadHours,
  }
}
