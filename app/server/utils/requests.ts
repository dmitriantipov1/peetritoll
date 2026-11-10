// Заявки (7.1, 7.2, 8.1): создание со снимком цен, смена статуса, правка — всё с записью в историю.
// Доступно в серверном коде без импорта. Виды, статусы и проверка данных — shared/requests.ts.
//
// Цены считает сервер по каталогу и меню дня: цифрам из браузера не верим.
// Сроки (предзаказ на сегодня, за сколько дней банкет) проверят формы сайта — шаг 2.
import { eq, inArray } from 'drizzle-orm'
import {
  catalogDishes,
  lunchDays,
  lunchDayTranslations,
  materials,
  requestHistory,
  requests,
  type RequestRow,
} from '../db/schema'
import type { Localized } from '#shared/menu'
import {
  PRIVACY_POLICY_VERSION,
  lunchFullNames,
  type RequestCalc,
  type RequestCalcLine,
  type RequestChange,
  type RequestDetails,
  type RequestInput,
  type RequestPatch,
  type RequestSource,
  type RequestStatus,
} from '#shared/requests'
import type { CatalogKind } from '#shared/catalog'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

function bad(message: string, path?: string): never {
  throw createError({
    statusCode: 400,
    message,
    data: path ? { issues: [{ path, message }] } : undefined,
  })
}

function byLocale<T extends { locale: string }, K extends keyof T>(rows: T[], key: K) {
  const result: Localized<string> = {}
  for (const r of rows) result[r.locale as keyof Localized<string>] = String(r[key])
  return result
}

// ---------- Снимок цен ----------

/** Банкет и группа: блюда своего каталога, цена и названия на момент отправки */
async function catalogCalc(
  kind: CatalogKind,
  items: { dishId: number; qty: number }[],
  source: RequestSource,
): Promise<RequestCalc> {
  const ids = [...new Set(items.map((i) => i.dishId))]
  const dishes = ids.length
    ? await useDb().query.catalogDishes.findMany({
        where: inArray(catalogDishes.id, ids),
        with: { translations: true, category: { with: { translations: true } } },
      })
    : []
  const found = new Map(dishes.map((d) => [d.id, d]))

  const lines: RequestCalcLine[] = []
  for (const item of items) {
    const dish = found.get(item.dishId)
    if (!dish || dish.category.kind !== kind) bad('В расчёте блюдо, которого нет в меню', 'items')
    // С сайта — только то, что можно заказать; персонал может внести и снятое блюдо
    if (source === 'site' && !dish.isAvailable) {
      bad('Одно из блюд сейчас нельзя заказать — обновите страницу', 'items')
    }
    const same = lines.find((l) => l.ref.kind === 'catalog' && l.ref.dishId === dish.id)
    if (same) {
      same.qty += item.qty
      continue
    }
    lines.push({
      ref: { kind: 'catalog', dishId: dish.id },
      names: byLocale(dish.translations, 'name'),
      category: byLocale(dish.category.translations, 'name'),
      priceCents: dish.priceCents,
      qty: item.qty,
    })
  }
  return finishCalc(lines)
}

/** Обед: суп, горячее, обед целиком — по меню и ценам выбранного дня */
async function lunchCalc(
  date: string,
  items: Record<'soup' | 'main' | 'full', number>,
): Promise<RequestCalc> {
  const [day] = await useDb().select().from(lunchDays).where(eq(lunchDays.date, date)).limit(1)
  if (!day) bad('На этот день меню дня нет', 'visitDate')
  const translations = await useDb()
    .select()
    .from(lunchDayTranslations)
    .where(eq(lunchDayTranslations.date, date))

  const names = {
    soup: byLocale(
      translations.filter((t) => t.soup),
      'soup',
    ),
    main: byLocale(
      translations.filter((t) => t.main),
      'main',
    ),
    full: lunchFullNames,
  }
  const price = { soup: day.soupCents, main: day.mainCents, full: day.fullCents }

  const lines: RequestCalcLine[] = []
  for (const item of ['soup', 'main', 'full'] as const) {
    if (!items[item]) continue
    const cents = price[item]
    if (cents === null) bad('На этот день такой позиции нет — обновите страницу', 'items')
    lines.push({
      ref: { kind: 'lunch', item },
      names: names[item],
      category: null,
      priceCents: cents,
      qty: items[item],
    })
  }
  return finishCalc(lines)
}

function finishCalc(lines: RequestCalcLine[]): RequestCalc {
  return {
    lines,
    totalCents: lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0),
    pricedAt: new Date().toISOString(),
  }
}

/** Запись на мероприятие: оно есть, это мероприятие, с сайта — запись открыта */
async function eventDetails(materialId: number, source: RequestSource): Promise<RequestDetails> {
  const material = await useDb().query.materials.findFirst({
    where: eq(materials.id, materialId),
    with: { translations: true, event: true },
  })
  if (!material || material.type !== 'event' || !material.event) {
    bad('Мероприятие не найдено', 'materialId')
  }
  if (source === 'site' && (material.state !== 'published' || !material.event.registrationOpen)) {
    bad('Запись на это мероприятие закрыта', 'materialId')
  }
  return { type: 'event', materialId, title: byLocale(material.translations, 'title') }
}

// ---------- Создание ----------

export interface CreateRequestOptions {
  source: RequestSource
  /** Кто внёс (заявка из админки) */
  userId?: number
  /** Галочка согласия на обработку в форме (8.1). С сайта без неё заявку не принимаем */
  consent?: boolean
}

/** Новая заявка: снимок цен, согласие, запись «поступила» в историю. Возвращает номер */
export async function createRequest(input: RequestInput, opts: CreateRequestOptions) {
  if (opts.source === 'site' && !opts.consent) {
    bad('Нужно согласие на обработку данных', 'consent')
  }

  let details: RequestDetails
  let calc: RequestCalc | null = null
  let visitDate: string | null = null
  let visitTime: string | null = null
  let guests: number | null = null

  switch (input.type) {
    case 'table':
      details = { type: 'table', occasion: input.occasion }
      ;({ visitDate, visitTime, guests } = input)
      break
    case 'banquet':
      details = { type: 'banquet', occasion: input.occasion, setTier: input.setTier }
      calc = await catalogCalc('banquet', input.items, opts.source)
      ;({ visitDate, visitTime, guests } = input)
      break
    case 'group':
      details = { type: 'group', agency: input.agency }
      calc = await catalogCalc('group', input.items, opts.source)
      ;({ visitDate, visitTime, guests } = input)
      break
    case 'lunch':
      details = { type: 'lunch', mode: input.mode }
      calc = await lunchCalc(input.visitDate, input.items)
      ;({ visitDate, visitTime } = input)
      break
    case 'tour':
      details = { type: 'tour', topic: input.topic }
      ;({ visitDate, guests } = input)
      break
    case 'event':
      details = await eventDetails(input.materialId, opts.source)
      guests = input.guests
      break
  }

  const now = new Date()
  return await useDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(requests)
      .values({
        type: input.type,
        source: opts.source,
        locale: input.locale,
        visitDate,
        visitTime,
        guests,
        name: input.name,
        phone: input.phone,
        email: input.email,
        comment: input.comment,
        details,
        calc,
        original: { visitDate, visitTime, guests },
        consentAt: opts.consent ? now : null,
        policyVersion: opts.consent ? PRIVACY_POLICY_VERSION : null,
        marketingOptIn: input.marketingOptIn,
        createdBy: opts.userId ?? null,
        updatedBy: opts.userId ?? null,
      })
      .returning({ id: requests.id })
    await tx.insert(requestHistory).values({
      requestId: row!.id,
      kind: 'created',
      userId: opts.userId ?? null,
      at: now,
    })
    return row!.id
  })
}

// ---------- Статус и правка ----------

async function lockRequest(tx: Tx, id: number): Promise<RequestRow> {
  const [row] = await tx.select().from(requests).where(eq(requests.id, id)).for('update').limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Заявка не найдена' })
  return row
}

/** Сменить статус. Тот же статус — ничего не пишем */
export async function setRequestStatus(
  id: number,
  status: RequestStatus,
  userId: number,
  note?: string | null,
) {
  await useDb().transaction(async (tx) => {
    const row = await lockRequest(tx, id)
    if (row.status === status) return
    await tx.update(requests).set({ status, updatedBy: userId }).where(eq(requests.id, id))
    await tx.insert(requestHistory).values({
      requestId: id,
      kind: 'status',
      changes: [{ field: 'status', from: row.status, to: status }],
      note: note ?? null,
      userId,
    })
  })
}

const patchFields = [
  'visitDate',
  'visitTime',
  'guests',
  'name',
  'phone',
  'email',
  'staffNote',
] as const

/**
 * Поправить визит, контакты, заметку. В историю — что было и что стало
 * («Время 18:30 → 18:00»). Заметку персонала в историю пишем без текста: она длинная и своя.
 */
export async function updateRequest(
  id: number,
  patch: RequestPatch,
  userId: number,
  note?: string | null,
) {
  await useDb().transaction(async (tx) => {
    const row = await lockRequest(tx, id)
    const changes: RequestChange[] = []
    const set: Partial<typeof requests.$inferInsert> = {}
    for (const field of patchFields) {
      if (!(field in patch)) continue
      const to = patch[field] ?? null
      const from = row[field] ?? null
      if (to === from) continue
      ;(set as Record<string, unknown>)[field] = to
      changes.push(field === 'staffNote' ? { field, from: null, to: null } : { field, from, to })
    }
    if (!changes.length) return
    await tx
      .update(requests)
      .set({ ...set, updatedBy: userId })
      .where(eq(requests.id, id))
    await tx.insert(requestHistory).values({
      requestId: id,
      kind: 'changed',
      changes,
      note: note ?? null,
      userId,
    })
  })
}
