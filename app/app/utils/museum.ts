// «Музей» и страница автора — перенос из прототипа как есть (museum.html, author.html, 15.11.2026).
// Пока постоянные данные, не из базы: авторов и книги заказчица будет вести в админке, когда
// дойдём до этого (книги — товары магазина, авторы — своя сущность). Тексты — в переводах.

/** Авторы — карточки в «Музее» и страница-шаблон /authors/<slug> */
export const museumAuthors = [
  { slug: 'kirillov', photo: '/images/author-kirillov.jpg' },
  { slug: 'laan', photo: '/images/author-laan.jpg' },
  { slug: 'maljutina', photo: '/images/author-maljutina.jpg' },
  // Четвёртый автор — 23.11.2026, фото пришлёт заказчица
  { slug: 'kats', photo: '/images/author-kats.jpg' },
] as const
export type MuseumAuthorSlug = (typeof museumAuthors)[number]['slug']

/** Книги издательства — как в прототипе: обложки и «Купить» из SumUp-магазина заказчицы */
export const museumBooks = [
  {
    key: 'bajki',
    price: '10,00 €',
    cover: 'https://images.sumup.com/img_4JCFJXNJ6H8B4ADHSJG1KQHB3D/image.png',
    url: 'https://peetritoll.sumupstore.com/toode/bajki-iz-za-barnoj-stojki',
  },
  {
    key: 'byloj',
    price: '12,00 €',
    cover: 'https://images.sumup.com/img_0G8BBCKVBM95NVYTSNS180BZCS/image.png',
    url: 'https://peetritoll.sumupstore.com/toode/byloj-paldiski-i-ego-ludi',
  },
  {
    key: 'rodnoj',
    price: '15,00 €',
    cover: 'https://images.sumup.com/img_229JGJ4Q7E80YRH6Y3C8VABYNE/image.png',
    url: 'https://peetritoll.sumupstore.com/toode/moj-rodnoj-paldiski',
  },
  {
    key: 'lood',
    price: '10,00 €',
    cover: 'https://images.sumup.com/img_6N5M8Y9MW39WGRC52XJ7V3XP7V/image.png',
    url: 'https://peetritoll.sumupstore.com/toode/lood-baarileti-tagant',
  },
  {
    key: 'kodulinn',
    price: '15,00 €',
    cover: 'https://images.sumup.com/img_4N8FJBPZDW80ATF832FR3HD759/image.png',
    url: 'https://peetritoll.sumupstore.com/toode/kodulinn-paldiski',
  },
] as const
