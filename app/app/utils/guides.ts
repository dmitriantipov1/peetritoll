// Гиды-партнёры на странице «Экскурсии и поездки» (services.html прототипа, 17.11.2026).
// Пока постоянные данные, не из базы — как авторы «Музея» (utils/museum.ts). Гостю — связаться
// напрямую: телефон и e-mail ссылками. Чего нет — строки нет. Фото пришлёт заказчица
// (пока заглушка с именем файла). Языки — ключи, названия — в переводах (services.guides.languages).

export type GuideLanguage = 'et' | 'ru' | 'en' | 'fi' | 'de'

export interface Guide {
  name: string
  photo: string
  languages: GuideLanguage[]
  /** Для ссылки tel: — без пробелов */
  phone: string
  /** Как показать */
  phoneText: string
  email?: string
}

export const guides: Guide[] = [
  {
    name: 'Riina Kangro',
    photo: '/images/guide-riina-kangro.jpg',
    languages: ['et', 'ru', 'en', 'fi', 'de'],
    phone: '+37251966787',
    phoneText: '+372 51966787',
    email: 'riinakangro.kangro@gmail.com',
  },
  {
    name: 'Tiina Laanejärv',
    photo: '/images/guide-tiina-laanejarv.jpg',
    languages: ['et', 'ru', 'en', 'fi'],
    phone: '+37256679368',
    phoneText: '+372 56679368',
  },
  {
    name: 'Andrus Kuiva',
    photo: '/images/guide-andrus-kuiva.jpg',
    languages: ['et', 'ru', 'en'],
    phone: '+37255576087',
    phoneText: '+372 55576087',
    email: 'andrus@paldiski360.ee',
  },
  {
    name: 'Heiki Hõimoja',
    photo: '/images/guide-heiki-hoimoja.jpg',
    // Языки заказчица не прислала; телефон был «5076007» — записан с кодом Эстонии
    languages: [],
    phone: '+3725076007',
    phoneText: '+372 5076007',
  },
]
