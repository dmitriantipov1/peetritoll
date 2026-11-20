// Подписи экскурсионной программы на сайте (20.11.2026) — для карточек на /excursions
// и короткого списка на «Услугах».
import type { SiteTour, TourLanguage } from '#shared/tours'
import { formatPrice } from '#shared/money'

export function useTourText() {
  const { t } = useI18n()

  /** «30 € за группу», «5,50 € с человека» — целые евро без копеек */
  const price = (tour: SiteTour) => {
    const euros =
      tour.priceCents % 100 ? formatPrice(tour.priceCents) : `${tour.priceCents / 100} €`
    return `${euros.replace(' €', ' €')} ${t(`services.tours.unit.${tour.priceUnit}`)}`
  }

  /** «60 минут · 5 € с человека · группа от 12 человек»; full — ещё и условия заказа */
  const meta = (tour: SiteTour, full = true) =>
    [
      tour.duration,
      price(tour),
      tour.minPeople ? t('services.tours.minPeople', { n: tour.minPeople }) : '',
      full ? tour.terms : '',
    ]
      .filter(Boolean)
      .join(' · ')

  /** «Эстонский, русский» — с заглавной первое слово, как в тексте заказчицы */
  const languages = (list: readonly TourLanguage[]) => {
    const text = list.map((l) => t(`services.guides.languages.${l}`)).join(', ')
    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  return { meta, languages }
}
