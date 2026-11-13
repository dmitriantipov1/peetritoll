// Страница-материал на сайте (5.7): политика конфиденциальности, cookies и другие тексты,
// которые заказчица ведёт в админке. Текст — HTML из редактора, уже очищенный при сохранении.
import type { Localized } from './menu'
import type { MediaImage } from './media'

export interface SitePage {
  title: string
  lead: string | null
  body: string
  cover: MediaImage | null
  updatedAt: string
  /** Адрес страницы на других языках — для переключателя языков; языка нет — страницы там нет */
  slugs: Localized<string>
}
