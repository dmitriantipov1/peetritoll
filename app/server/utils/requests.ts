// Заявки (7.1, 7.2, 8.1): создание со снимком цен, смена статуса, правка — всё с записью в историю.
// Доступно в серверном коде без импорта. Виды, статусы и проверка данных — shared/requests.ts.
//
// Цены считает сервер по каталогу и меню дня: цифрам из браузера не верим.
// Сроки (предзаказ на сегодня, за сколько дней банкет) проверят формы сайта — шаг 2.
import { desc, eq, inArray } from 'drizzle-orm'
import {
  catalogDishes,
  lunchDays,
  lunchDayTranslations,
  materials,
  requestHistory,
  requests,
  users,
  type RequestRow,
  type UserRow,
} from '../db/schema'
import type { Localized } from '#shared/menu'
import { accessTo, allows } from '#shared/access'
import { formatPrice } from '#shared/money'
import { dishWords, plural } from '#shared/plural'
import {
  PRIVACY_POLICY_VERSION,
  banquetOccasionNames,
  lunchModeNames,
  requestSection,
  requestTypes,
  ruFirst,
  tableOccasionNames,
  tourTopicNames,
  type AdminRequest,
  type AdminRequestRow,
  type RequestSave,
  type RequestType,
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
  /** Отправить письмо и Telegram (5.4). По умолчанию — да */
  notify?: boolean
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
  const id = await useDb().transaction(async (tx) => {
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
      .returning()
    await tx.insert(requestHistory).values({
      requestId: row!.id,
      kind: 'created',
      userId: opts.userId ?? null,
      at: now,
    })
    // Контакт в лидах (8.2) — в той же транзакции: заявка без контакта не остаётся
    await linkRequestToLead(tx, row!)
    return row!.id
  })
  // Письмо и Telegram — после сохранения: сбой отправки заявку не теряет (5.4)
  if (opts.notify !== false) await notifyNewRequest(id)
  return id
}

// ---------- Статус и правка ----------

async function lockRequest(tx: Tx, id: number): Promise<RequestRow> {
  const [row] = await tx.select().from(requests).where(eq(requests.id, id)).for('update').limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Заявка не найдена' })
  return row
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
 * Сохранить карточку одним действием: поля и статус. В историю — до двух строк:
 * что изменили («Время 18:30 → 18:00») и смену статуса. Заметку персонала пишем без текста:
 * она длинная и своя. Ничего не поменялось — ничего не пишем. Возвращает, было ли что сохранить.
 */
export async function saveRequest(id: number, input: RequestSave, userId: number) {
  return await useDb().transaction(async (tx) => {
    const row = await lockRequest(tx, id)
    const changes: RequestChange[] = []
    const set: Partial<typeof requests.$inferInsert> = {}
    for (const field of patchFields) {
      if (!(field in input)) continue
      const to = input[field] ?? null
      const from = row[field] ?? null
      if (to === from) continue
      ;(set as Record<string, unknown>)[field] = to
      changes.push(field === 'staffNote' ? { field, from: null, to: null } : { field, from, to })
    }
    const statusChanged = !!input.status && input.status !== row.status
    if (statusChanged) set.status = input.status
    if (!changes.length && !statusChanged) return false

    await tx
      .update(requests)
      .set({ ...set, updatedBy: userId })
      .where(eq(requests.id, id))
    const note = input.note ?? null
    if (changes.length) {
      await tx
        .insert(requestHistory)
        .values({ requestId: id, kind: 'changed', changes, note, userId })
    }
    if (statusChanged) {
      await tx.insert(requestHistory).values({
        requestId: id,
        kind: 'status',
        changes: [{ field: 'status', from: row.status, to: input.status! }],
        // Пояснение — к изменению полей, если оно было, иначе к статусу
        note: changes.length ? null : note,
        userId,
      })
    }
    return true
  })
}

export async function setRequestStatus(
  id: number,
  status: RequestStatus,
  userId: number,
  note?: string | null,
) {
  return await saveRequest(id, { status, note: note ?? null }, userId)
}

export async function updateRequest(
  id: number,
  patch: RequestPatch,
  userId: number,
  note?: string | null,
) {
  return await saveRequest(id, { ...patch, note: note ?? null }, userId)
}

// ---------- Для админки ----------

/** Какие виды заявок сотрудник видит (или правит) — по правам разделов */
export function requestTypesFor(user: UserRow, needed: 'view' | 'edit' = 'view'): RequestType[] {
  return requestTypes.filter((t) =>
    allows(accessTo(user.role, user.permissions, requestSection[t]), needed),
  )
}

/** Проверка прав на заявку этого вида. Без прав — 403 */
export function requireRequestAccess(user: UserRow, type: RequestType, needed: 'view' | 'edit') {
  if (!requestTypesFor(user, needed).includes(type)) {
    throw createError({ statusCode: 403, message: 'Нет доступа к заявкам этого вида' })
  }
}

/**
 * «День рождения · 8 блюд · ≈ 956 €» — подробности одной строкой.
 * withComment — у брони стола своих подробностей нет, в списке вместо них показываем пожелание гостя.
 * В письме и Telegram комментарий идёт отдельной строкой, там его не дублируем.
 */
export function requestSummary(row: RequestRow, withComment = true): string {
  const parts: string[] = []
  const d = row.details
  const calc = row.calc
  const dishes = () => {
    if (!calc?.lines.length) return
    parts.push(`${calc.lines.length} ${plural(calc.lines.length, dishWords)}`)
    parts.push(`≈ ${formatPrice(calc.totalCents)}`)
  }
  switch (d.type) {
    case 'table':
      if (d.occasion && d.occasion !== 'dinner') parts.push(tableOccasionNames[d.occasion])
      break
    case 'banquet':
      if (d.occasion) parts.push(banquetOccasionNames[d.occasion])
      dishes()
      break
    case 'group':
      if (d.agency) parts.push(d.agency)
      dishes()
      break
    case 'lunch':
      for (const l of calc?.lines ?? []) parts.push(`${ruFirst(l.names)} × ${l.qty}`)
      parts.push(lunchModeNames[d.mode].toLowerCase())
      break
    case 'tour':
      parts.push(tourTopicNames[d.topic])
      break
    case 'event':
      parts.push(ruFirst(d.title))
      break
  }
  // У брони стола подробностей нет — показываем пожелание гостя
  if (withComment && !parts.length && row.comment) parts.push(`«${row.comment}»`)
  return parts.join(' · ')
}

function toRow(row: RequestRow): AdminRequestRow {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    visitDate: row.visitDate,
    visitTime: row.visitTime,
    guests: row.guests,
    name: row.name,
    phone: row.phone,
    email: row.email,
    topic: row.details.type === 'tour' ? row.details.topic : null,
    summary: requestSummary(row),
    totalCents: row.calc?.totalCents ?? null,
  }
}

/** Заявки видов, к которым у сотрудника есть доступ, — сначала новые */
export async function loadRequestList(user: UserRow): Promise<AdminRequestRow[]> {
  const types = requestTypesFor(user)
  if (!types.length) return []
  const rows = await useDb()
    .select()
    .from(requests)
    .where(inArray(requests.type, types))
    .orderBy(desc(requests.createdAt))
  return rows.map(toRow)
}

/** Карточка заявки с историей и ценами каталога сейчас — чтобы видеть, что подорожало */
export async function loadRequest(id: number, user: UserRow): Promise<AdminRequest> {
  const [row] = await useDb().select().from(requests).where(eq(requests.id, id)).limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Заявка не найдена' })
  requireRequestAccess(user, row.type, 'view')

  const history = await useDb()
    .select({ item: requestHistory, userName: users.name })
    .from(requestHistory)
    .leftJoin(users, eq(users.id, requestHistory.userId))
    .where(eq(requestHistory.requestId, id))
    .orderBy(desc(requestHistory.at), desc(requestHistory.id))

  const names = new Map<number, string>()
  const userIds = [row.createdBy].filter((v): v is number => !!v)
  if (userIds.length) {
    for (const u of await useDb()
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds)))
      names.set(u.id, u.name)
  }

  let calc: AdminRequest['calc'] = null
  if (row.calc) {
    const dishIds = row.calc.lines.flatMap((l) => (l.ref.kind === 'catalog' ? [l.ref.dishId] : []))
    const now = new Map(
      dishIds.length
        ? (
            await useDb()
              .select({ id: catalogDishes.id, priceCents: catalogDishes.priceCents })
              .from(catalogDishes)
              .where(inArray(catalogDishes.id, dishIds))
          ).map((d) => [d.id, d.priceCents])
        : [],
    )
    calc = {
      ...row.calc,
      lines: row.calc.lines.map((l) => ({
        ...l,
        // У обеда цена своя на каждый день — сравнивать не с чем
        nowCents: l.ref.kind === 'catalog' ? (now.get(l.ref.dishId) ?? null) : l.priceCents,
      })),
    }
  }

  return {
    ...toRow(row),
    locale: row.locale,
    comment: row.comment,
    staffNote: row.staffNote,
    details: row.details,
    calc,
    original: row.original,
    consentAt: row.consentAt?.toISOString() ?? null,
    policyVersion: row.policyVersion,
    marketingOptIn: row.marketingOptIn,
    createdByName: row.createdBy ? (names.get(row.createdBy) ?? null) : null,
    lead: await leadForRequest(row.leadId),
    updatedAt: row.updatedAt.toISOString(),
    history: history.map(({ item, userName }) => ({
      id: item.id,
      kind: item.kind,
      changes: item.changes,
      note: item.note,
      at: item.at.toISOString(),
      userName,
    })),
  }
}
