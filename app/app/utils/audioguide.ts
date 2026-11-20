// Аудиогид по Палдиски и Пакри (страница /audioguide и короткий блок в «Услугах», 20.11.2026).

/** Аудиогид в Navicup — по QR-коду и по кнопкам */
export const NAVICUP_URL = 'https://app.navicup.com/?eventID=5377&redirect_back=true'

/** Фрагменты аудиогида — файлы в public/media/audioguide/<язык>/. Пока есть только русские
 *  записи; эстонские и английские заказчица пришлёт позже — до тех пор на et/en блока нет.
 *  Заказчица оставила два из трёх, «Железная дорога» (02, 5:29) — по желанию */
export const audioFiles: Record<string, { key: string; file: string; seconds: number }[]> = {
  ru: [
    { key: 'facts', file: '01-interesting-facts.mp3', seconds: 138 },
    { key: 'border', file: '03-border-house.mp3', seconds: 307 },
  ],
}
