// Контакты и часы для сайта — страница «Контакты» и подвал. Раздела-выключателя нет:
// контакты показываются всегда. Доступно в серверном коде без импорта.
import type { SiteContacts } from '#shared/site-contacts'
import { hoursLine } from '#shared/contacts'
import { todayInTallinn } from '#shared/dates'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'

const pick = (texts: Localized<string>, locale: ContentLocale) =>
  pickTranslation(
    Object.entries(texts)
      .filter(([, text]) => text)
      .map(([l, text]) => ({ locale: l, text: text! })),
    locale,
  )?.text ?? ''

export async function loadSiteContacts(locale: ContentLocale): Promise<SiteContacts> {
  const { hours, contacts } = await loadContacts()
  const today = todayInTallinn()
  return {
    address: pick(contacts.address, locale),
    phone: contacts.phone,
    whatsapp: contacts.whatsapp,
    email: contacts.email,
    mapUrl: contacts.mapUrl,
    facebook: contacts.facebook,
    tripadvisor: contacts.tripadvisor,
    foursquare: contacts.foursquare,
    hoursLine: hoursLine(hours.week, locale),
    week: hours.week,
    specialDays: hours.specialDays
      .filter((d) => d.date >= today)
      .map((d) => ({
        date: d.date,
        open: d.open,
        from: d.from,
        to: d.to,
        label: pick(d.label, locale),
      })),
  }
}
