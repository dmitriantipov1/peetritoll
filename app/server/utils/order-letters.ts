// Письма покупателю (7.3, решение 28.11.2026). Доступно в серверном коде без импорта.
// На языке версии сайта, где оформлен заказ (тексты et/en — проверить переводчику).
// Ответ на письмо уходит на «почту для заявок» из настроек сайта. Что ушло — в историю заказа.
//
// accepted — заказ принят, без онлайн-оплаты: пришлём, как оплатить;
// paid — оплачен (SumUp или персонал); ready — готов к выдаче; shipped — отправлен (трек-номер);
// cancelled — отменён персоналом. Отмена по сроку — без письма.
import { eq } from 'drizzle-orm'
import { orderHistory, orders, type OrderRow } from '../db/schema'
import type { ContentLocale } from '#shared/locales'
import { formatPrice } from '#shared/money'
import type { BuyerLetter } from '#shared/orders'
import { defaultNotifications, notificationsSchema } from '#shared/site-settings'

type Item = { name: string; label: string; qty: number; priceCents: number; kind: string }
type Order = OrderRow & { items: Item[] }

const ADDRESS = {
  ru: 'таверне «Петровская Таможня», Mere 10, Палдиски',
  et: 'kõrtsis Peetri Toll, Mere 10, Paldiski',
  en: 'Tavern Peetri Toll, Mere 10, Paldiski',
} as const

/** Слова и фразы писем на трёх языках */
const L = {
  ru: {
    hello: (name: string) => `Здравствуйте, ${name}!`,
    order: (id: number, date: string) => `Заказ № ${id} от ${date}`,
    delivery: 'Доставка',
    free: 'бесплатно',
    total: 'Итого',
    receive: 'Получение',
    pickup: `самовывоз в ${ADDRESS.ru}`,
    parcel: (carrier: string, point: string) => `почтомат ${carrier}: ${point}`,
    eu: (where: string) => `почтой: ${where}`,
    tracking: (no: string) => `Трек-номер: ${no}`,
    footer: 'Вопросы по заказу — просто ответьте на это письмо.',
    sign: 'Tavern Peetri Toll, Mere 10, Палдиски',
    accepted: {
      subject: (id: number) => `Заказ № ${id} принят — Tavern Peetri Toll`,
      text: 'Спасибо за заказ в музейной лавке Peetri Toll! Мы проверим наличие и пришлём на этот адрес, как его оплатить.',
    },
    paid: {
      subject: (id: number) => `Заказ № ${id} оплачен — Tavern Peetri Toll`,
      text: 'Спасибо за покупку в музейной лавке Peetri Toll! Мы получили оплату.',
      pickup: `Заказ можно будет забрать в ${ADDRESS.ru} в часы работы ресторана — напишем, когда он будет готов.`,
      parcel: 'Отправим в почтомат в течение 1–2 рабочих дней и пришлём трек-номер.',
      eu: 'Отправим посылку в течение 1–2 рабочих дней и пришлём трек-номер.',
      digital: 'Ссылки на цифровые покупки пришлём отдельным письмом.',
    },
    ready: {
      subject: (id: number) => `Заказ № ${id} готов к выдаче — Tavern Peetri Toll`,
      text: `Ваш заказ собран и ждёт вас в ${ADDRESS.ru}. Забрать его можно в часы работы ресторана — назовите номер заказа.`,
    },
    shipped: {
      subject: (id: number) => `Заказ № ${id} отправлен — Tavern Peetri Toll`,
      parcel: 'Заказ отправлен в почтомат. Код для получения придёт в SMS от службы доставки.',
      eu: 'Посылка отправлена. Срок доставки — от 5 до 14 дней, зависит от страны.',
      other: 'Заказ отправлен.',
    },
    cancelled: {
      subject: (id: number) => `Заказ № ${id} отменён — Tavern Peetri Toll`,
      text: 'Ваш заказ отменён. Если он был оплачен, мы свяжемся с вами насчёт возврата денег. Если отмена для вас неожиданна — ответьте на это письмо.',
    },
  },
  et: {
    hello: (name: string) => `Tere, ${name}!`,
    order: (id: number, date: string) => `Tellimus nr ${id}, ${date}`,
    delivery: 'Kohaletoimetamine',
    free: 'tasuta',
    total: 'Kokku',
    receive: 'Kättesaamine',
    pickup: 'järeletulek: Peetri Tolli kõrts, Mere 10, Paldiski',
    parcel: (carrier: string, point: string) => `pakiautomaat ${carrier}: ${point}`,
    eu: (where: string) => `postiga: ${where}`,
    tracking: (no: string) => `Jälgimiskood: ${no}`,
    footer: 'Küsimused tellimuse kohta — vastake lihtsalt sellele kirjale.',
    sign: 'Tavern Peetri Toll, Mere 10, Paldiski',
    accepted: {
      subject: (id: number) => `Tellimus nr ${id} on vastu võetud — Tavern Peetri Toll`,
      text: 'Täname tellimuse eest Peetri Tolli muuseumipoes! Kontrollime saadavust ja saadame sellele aadressile, kuidas tellimuse eest tasuda.',
    },
    paid: {
      subject: (id: number) => `Tellimus nr ${id} on makstud — Tavern Peetri Toll`,
      text: 'Täname ostu eest Peetri Tolli muuseumipoes! Makse on kätte saadud.',
      pickup: `Tellimuse saab kätte ${ADDRESS.et} restorani lahtiolekuaegadel — anname teada, kui see on valmis.`,
      parcel: 'Saadame pakiautomaati 1–2 tööpäeva jooksul ja saadame jälgimiskoodi.',
      eu: 'Saadame paki teele 1–2 tööpäeva jooksul ja saadame jälgimiskoodi.',
      digital: 'Digitaalsete ostude lingid saadame eraldi kirjaga.',
    },
    ready: {
      subject: (id: number) => `Tellimus nr ${id} on valmis — Tavern Peetri Toll`,
      text: `Teie tellimus on komplekteeritud ja ootab teid ${ADDRESS.et}. Selle saab kätte restorani lahtiolekuaegadel — öelge tellimuse number.`,
    },
    shipped: {
      subject: (id: number) => `Tellimus nr ${id} on teele saadetud — Tavern Peetri Toll`,
      parcel: 'Tellimus on saadetud pakiautomaati. Kättesaamise kood tuleb SMS-iga kullerfirmalt.',
      eu: 'Pakk on teele saadetud. Kohaletoimetamine võtab 5–14 päeva, sõltuvalt riigist.',
      other: 'Tellimus on teele saadetud.',
    },
    cancelled: {
      subject: (id: number) => `Tellimus nr ${id} on tühistatud — Tavern Peetri Toll`,
      text: 'Teie tellimus on tühistatud. Kui see oli juba makstud, võtame raha tagastamise osas teiega ühendust. Kui tühistamine tuli üllatusena, vastake sellele kirjale.',
    },
  },
  en: {
    hello: (name: string) => `Hello ${name},`,
    order: (id: number, date: string) => `Order No. ${id}, ${date}`,
    delivery: 'Shipping',
    free: 'free',
    total: 'Total',
    receive: 'Delivery method',
    pickup: `pickup at ${ADDRESS.en}`,
    parcel: (carrier: string, point: string) => `parcel locker ${carrier}: ${point}`,
    eu: (where: string) => `by post: ${where}`,
    tracking: (no: string) => `Tracking number: ${no}`,
    footer: 'Questions about your order? Just reply to this email.',
    sign: 'Tavern Peetri Toll, Mere 10, Paldiski',
    accepted: {
      subject: (id: number) => `Order No. ${id} received — Tavern Peetri Toll`,
      text: 'Thank you for your order at the Peetri Toll museum shop! We will check availability and send you payment details to this address.',
    },
    paid: {
      subject: (id: number) => `Order No. ${id} paid — Tavern Peetri Toll`,
      text: 'Thank you for shopping at the Peetri Toll museum shop! We have received your payment.',
      pickup: `You can collect your order at ${ADDRESS.en} during restaurant opening hours — we will let you know when it is ready.`,
      parcel:
        'We will send it to the parcel locker within 1–2 working days and email you the tracking number.',
      eu: 'We will send the parcel within 1–2 working days and email you the tracking number.',
      digital: 'Links to your digital purchases will follow in a separate email.',
    },
    ready: {
      subject: (id: number) => `Order No. ${id} is ready for pickup — Tavern Peetri Toll`,
      text: `Your order is packed and waiting for you at ${ADDRESS.en}. Collect it during restaurant opening hours — just give your order number.`,
    },
    shipped: {
      subject: (id: number) => `Order No. ${id} has been sent — Tavern Peetri Toll`,
      parcel:
        'Your order is on its way to the parcel locker. The pickup code will come by SMS from the carrier.',
      eu: 'Your parcel is on its way. Delivery takes 5 to 14 days depending on the country.',
      other: 'Your order has been sent.',
    },
    cancelled: {
      subject: (id: number) => `Order No. ${id} cancelled — Tavern Peetri Toll`,
      text: 'Your order has been cancelled. If it was already paid, we will contact you about the refund. If this comes as a surprise, please reply to this email.',
    },
  },
} satisfies Record<ContentLocale, unknown>

const dateFmt = { et: 'et-EE', en: 'en-GB', ru: 'ru-RU' } as const

function countryName(code: string, locale: ContentLocale) {
  try {
    return new Intl.DisplayNames(dateFmt[locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** Куда и как получить — одной строкой на языке письма */
function receiveLine(o: Order, t: (typeof L)[ContentLocale]): string | null {
  const s = o.shipTo
  if (s?.method === 'parcel') return t.parcel(s.carrier, s.point)
  if (s?.method === 'eu')
    return t.eu(`${countryName(s.country, o.locale)}, ${s.postcode}, ${s.address}`)
  if (o.delivery === 'pickup') return t.pickup
  return null
}

/** Состав и суммы: «Заказ № 2001 от 28.11.2026», строки, доставка, итого, получение */
function summary(o: Order, t: (typeof L)[ContentLocale]): string[] {
  const date = o.createdAt.toLocaleDateString(dateFmt[o.locale], { timeZone: 'Europe/Tallinn' })
  const lines = [
    t.order(o.id, date),
    ...o.items.map((i) => {
      const what = i.label ? `${i.name} (${i.label})` : i.name
      return `  ${what} — ${i.qty} × ${formatPrice(i.priceCents)} = ${formatPrice(i.qty * i.priceCents)}`
    }),
  ]
  if (o.delivery !== 'none') {
    lines.push(`${t.delivery}: ${o.deliveryCents ? formatPrice(o.deliveryCents) : t.free}`)
  }
  lines.push(`${t.total}: ${formatPrice(o.totalCents)}`)
  const receive = receiveLine(o, t)
  if (receive) lines.push(`${t.receive}: ${receive}`)
  return lines
}

/** Тема и текст письма. Отдельно от отправки — для проверки и тестов */
export function buildBuyerLetter(o: Order, kind: BuyerLetter): { subject: string; text: string } {
  const t = L[o.locale] ?? L.ru
  const hasDigital = o.items.some((i) => i.kind === 'digital')
  let subject: string
  let body: string[]
  switch (kind) {
    case 'accepted':
      subject = t.accepted.subject(o.id)
      body = [t.accepted.text, '', ...summary(o, t)]
      break
    case 'paid': {
      subject = t.paid.subject(o.id)
      const next = [
        o.delivery === 'pickup' || o.delivery === 'parcel' || o.delivery === 'eu'
          ? t.paid[o.delivery]
          : '',
        hasDigital ? t.paid.digital : '',
      ].filter(Boolean)
      body = [t.paid.text, '', ...summary(o, t), '', ...next]
      break
    }
    case 'ready':
      subject = t.ready.subject(o.id)
      body = [t.ready.text]
      break
    case 'shipped': {
      subject = t.shipped.subject(o.id)
      const receive = receiveLine(o, t)
      body = [
        o.delivery === 'parcel'
          ? t.shipped.parcel
          : o.delivery === 'eu'
            ? t.shipped.eu
            : t.shipped.other,
        receive && o.delivery !== 'pickup' ? `${t.receive}: ${receive}` : '',
        o.trackingNo ? t.tracking(o.trackingNo) : '',
      ].filter(Boolean)
      break
    }
    case 'cancelled':
      subject = t.cancelled.subject(o.id)
      body = [t.cancelled.text]
      break
  }
  const text = [t.hello(o.name), '', ...body, '', t.footer, '', t.sign, siteUrl()].join('\n')
  return { subject, text }
}

const letterNames: Record<BuyerLetter, string> = {
  accepted: 'заказ принят',
  paid: 'оплачен',
  ready: 'готов к выдаче',
  shipped: 'отправлен',
  cancelled: 'отменён',
}

/** Отправить письмо покупателю. Ошибки не бросает — пишет в историю заказа, что ушло или почему нет */
export async function sendBuyerLetter(orderId: number, kind: BuyerLetter) {
  const o = await useDb().query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { orderBy: (i, { asc }) => [asc(i.sort)] } },
  })
  if (!o) return
  const log = (note: string) =>
    useDb().insert(orderHistory).values({ orderId, kind: 'notified', note })
  const what = `Письмо покупателю «${letterNames[kind]}»`
  if (!mailConfigured()) {
    await log(`${what} не отправлено: почта на сервере не настроена`)
    return
  }
  const { email: replyTo } = await readSetting(
    'notifications',
    notificationsSchema,
    defaultNotifications,
  )
  try {
    await sendMail({ to: o.email, ...buildBuyerLetter(o, kind), replyTo: replyTo || undefined })
    await log(`${what} на ${o.email}`)
  } catch (e) {
    console.error(`Заказ № ${orderId}: письмо покупателю не ушло`, e)
    await log(`${what} на ${o.email} не ушло: ${(e as Error).message}`)
  }
}
