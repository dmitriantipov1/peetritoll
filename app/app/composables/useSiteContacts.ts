// Контакты и часы из настроек — одним запросом на подвал и страницу «Контакты» (общий ключ).
// При смене языка запрос повторяется сам: язык — часть query.
import type { SiteContacts } from '#shared/site-contacts'

export function useSiteContacts() {
  const { locale } = useI18n()
  return useFetch<SiteContacts>('/api/site/contacts', {
    key: 'site-contacts',
    query: { locale },
  })
}
