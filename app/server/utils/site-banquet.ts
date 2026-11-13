// «Пиршества и застолья» для сайта: каталог, сеты и настройки. Раздел «Запрос на банкет»
// выключен или скрыт на этом языке — страницы нет (null). Доступно в серверном коде без импорта.
import type { SiteBanquet } from '#shared/site-banquet'
import { pricePerGuest } from '#shared/catalog'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'
import { todayInTallinn } from '#shared/dates'

const pick = (texts: Localized<string>, locale: ContentLocale) =>
  pickTranslation(
    Object.entries(texts)
      .filter(([, text]) => text)
      .map(([l, text]) => ({ locale: l, text: text! })),
    locale,
  )?.text ?? ''

export async function loadSiteBanquet(locale: ContentLocale): Promise<SiteBanquet | null> {
  const { banquet } = await readSections()
  if (!banquet.enabled || !banquet.locales[locale]) return null

  const catalog = await loadCatalog('banquet')
  const categories = catalog.categories
    .map((c) => ({
      id: c.id,
      name: pick(c.names, locale),
      dishes: c.dishes
        .filter((d) => d.isAvailable)
        .map((d) => ({
          id: d.id,
          name: pick(d.names, locale),
          priceCents: d.priceCents,
          unit: d.unit,
          servesGuests: d.servesGuests,
        })),
    }))
    .filter((c) => c.dishes.length)
  const dishes = new Map(categories.flatMap((c) => c.dishes).map((d) => [d.id, d]))

  // Сет — только из блюд, которые можно заказать; пустой сет не показываем (как в админке)
  const sets = catalog.sets.flatMap((set) => {
    const dishIds = set.dishIds.filter((id) => dishes.has(id))
    if (!dishIds.length) return []
    return [
      {
        tier: set.tier,
        name: pick(set.names, locale),
        dishIds,
        pricePerGuestCents: dishIds.reduce((sum, id) => {
          const d = dishes.get(id)!
          return sum + pricePerGuest(d.priceCents, d.servesGuests)
        }, 0),
      },
    ]
  })

  const s = catalog.settings
  return {
    categories,
    sets,
    capacityMin: s.capacityMin,
    capacityMax: s.capacityMax,
    leadDays: s.leadDays,
    hint: pick(s.hint, locale),
    warnCategoryId: s.warnCategoryId,
    warnMinPerGuest: s.warnMinPerGuest,
    today: todayInTallinn(),
  }
}
