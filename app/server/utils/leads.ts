// Лиды (8.2): склейка контактов из заявок, автотеги, список и карточка для админки.
// Доступно в серверном коде без импорта. Типы и правила — shared/leads.ts.
import { and, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import { leads, leadTags, requests, type LeadRow, type RequestRow } from '../db/schema'
import {
  autoTagFor,
  phoneKey,
  requestCategory,
  type AdminLead,
  type AdminLeadRow,
  type LeadCategory,
  type LeadInput,
  type LeadTagCount,
} from '#shared/leads'
import { ruFirst } from '#shared/requests'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

// ---------- Склейка ----------

/** Автотег заявки: «бронь стола», «мероприятие: Ночь музеев», «Pakri Express» */
function requestTag(row: RequestRow): string {
  const d = row.details
  return autoTagFor(row.type, {
    topic: d.type === 'tour' ? d.topic : undefined,
    eventTitle: d.type === 'event' ? ruFirst(d.title) : undefined,
  })
}

/**
 * Найти контакт заявки или завести новый и привязать к нему заявку (8.2).
 * Ключ склейки — почта; без почты — телефон. Если почта есть, но новая, а телефон совпал
 * с чужим контактом, — это новый контакт и «возможный дубль»: склеивать по одному телефону
 * людей с разными почтами нельзя, это может быть семья с общим номером.
 * Согласие на рассылку переносим только из заявки с сайта: галочку ставил сам гость.
 */
export async function linkRequestToLead(tx: Tx, row: RequestRow): Promise<number> {
  const key = phoneKey(row.phone)
  let lead: LeadRow | undefined
  if (row.email) {
    ;[lead] = await tx.select().from(leads).where(eq(leads.email, row.email)).limit(1)
  } else if (key) {
    ;[lead] = await tx
      .select()
      .from(leads)
      .where(eq(leads.phoneKey, key))
      .orderBy(desc(leads.lastEventAt))
      .limit(1)
  }

  const optIn = row.source === 'site' && row.marketingOptIn
  const marketing = optIn
    ? {
        marketing: 'yes' as const,
        marketingAt: row.createdAt,
        marketingSource: `заявка № ${row.id}`,
      }
    : {}

  if (!lead) {
    ;[lead] = await tx
      .insert(leads)
      .values({
        name: row.name,
        email: row.email,
        phone: row.phone,
        phoneKey: key,
        locale: row.locale,
        lastEventAt: row.createdAt,
        createdAt: row.createdAt,
        ...marketing,
      })
      .returning()
  } else {
    // Дополняем пустое, но не переписываем то, что персонал мог поправить руками
    const later = row.createdAt >= lead.lastEventAt
    await tx
      .update(leads)
      .set({
        phone: lead.phone ?? row.phone,
        phoneKey: lead.phoneKey ?? key,
        email: lead.email ?? row.email,
        ...(later ? { locale: row.locale, lastEventAt: row.createdAt } : {}),
        // Согласие не снимаем: отказ от рассылки — только явный
        ...(optIn && lead.marketing !== 'yes' ? marketing : {}),
      })
      .where(eq(leads.id, lead.id))
  }

  await tx
    .insert(leadTags)
    .values({ leadId: lead!.id, tag: requestTag(row), auto: true })
    .onConflictDoUpdate({ target: [leadTags.leadId, leadTags.tag], set: { auto: true } })
  await tx.update(requests).set({ leadId: lead!.id }).where(eq(requests.id, row.id))
  return lead!.id
}

/** Привязать заявки, у которых контакта ещё нет (заведены до лидов), — по порядку поступления */
export async function linkOrphanRequests(): Promise<number> {
  const orphans = await useDb()
    .select()
    .from(requests)
    .where(sql`${requests.leadId} is null`)
    .orderBy(requests.createdAt, requests.id)
  for (const row of orphans) {
    await useDb().transaction((tx) => linkRequestToLead(tx, row))
  }
  return orphans.length
}

// ---------- Для админки ----------

interface LeadStats {
  events: number
  categories: LeadCategory[]
}

/** Сколько заявок у каждого контакта и каких категорий */
async function statsFor(ids: number[]): Promise<Map<number, LeadStats>> {
  const result = new Map<number, LeadStats>()
  if (!ids.length) return result
  const rows = await useDb()
    .select({ leadId: requests.leadId, type: requests.type, n: sql<number>`count(*)::int` })
    .from(requests)
    .where(inArray(requests.leadId, ids))
    .groupBy(requests.leadId, requests.type)
  for (const r of rows) {
    const s = result.get(r.leadId!) ?? { events: 0, categories: [] }
    s.events += r.n
    const cat = requestCategory[r.type]
    if (!s.categories.includes(cat)) s.categories.push(cat)
    result.set(r.leadId!, s)
  }
  return result
}

/** Телефоны, которые есть больше чем у одного контакта */
async function dupePhones(): Promise<Set<string>> {
  const rows = await useDb()
    .select({ key: leads.phoneKey })
    .from(leads)
    .where(isNotNull(leads.phoneKey))
    .groupBy(leads.phoneKey)
    .having(sql`count(*) > 1`)
  return new Set(rows.map((r) => r.key!))
}

function toRow(
  lead: LeadRow & { tags: { tag: string; auto: boolean }[] },
  stats: LeadStats | undefined,
  dupes: Set<string>,
): AdminLeadRow {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    locale: lead.locale,
    marketing: lead.marketing,
    marketingAt: lead.marketingAt?.toISOString() ?? null,
    // Сначала автотеги — откуда пришёл человек, потом свои
    tags: [...lead.tags]
      .sort((a, b) => Number(b.auto) - Number(a.auto) || a.tag.localeCompare(b.tag, 'ru'))
      .map(({ tag, auto }) => ({ tag, auto })),
    categories: stats?.categories ?? [],
    events: stats?.events ?? 0,
    lastEventAt: lead.lastEventAt.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    possibleDupe: !!lead.phoneKey && dupes.has(lead.phoneKey),
  }
}

/** Все контакты: сначала с последним обращением */
export async function loadLeadList(): Promise<AdminLeadRow[]> {
  const list = await useDb().query.leads.findMany({
    with: { tags: true },
    orderBy: [desc(leads.lastEventAt)],
  })
  const [stats, dupes] = await Promise.all([statsFor(list.map((l) => l.id)), dupePhones()])
  return list.map((l) => toRow(l, stats.get(l.id), dupes))
}

/** Карточка: контакт, события, согласия, возможные дубли */
export async function loadLead(id: number): Promise<AdminLead> {
  const lead = await useDb().query.leads.findFirst({
    where: eq(leads.id, id),
    with: { tags: true },
  })
  if (!lead) throw createError({ statusCode: 404, message: 'Контакт не найден' })

  const events = await useDb()
    .select()
    .from(requests)
    .where(eq(requests.leadId, id))
    .orderBy(desc(requests.createdAt))
  const others = lead.phoneKey
    ? await useDb()
        .select()
        .from(leads)
        .where(and(eq(leads.phoneKey, lead.phoneKey), ne(leads.id, id)))
    : []
  const [stats, dupes, otherStats] = await Promise.all([
    statsFor([id]),
    dupePhones(),
    statsFor(others.map((o) => o.id)),
  ])

  const consented = events.find((e) => e.consentAt && e.policyVersion)
  return {
    ...toRow(lead, stats.get(id), dupes),
    marketingSource: lead.marketingSource,
    history: events.map((e) => ({
      requestId: e.id,
      type: e.type,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
      visitDate: e.visitDate,
      visitTime: e.visitTime,
      guests: e.guests,
      summary: requestSummary(e),
      comment: e.comment,
    })),
    consent: consented
      ? {
          at: consented.consentAt!.toISOString(),
          requestId: consented.id,
          policyVersion: consented.policyVersion!,
        }
      : null,
    dupes: others.map((o) => ({
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      events: otherStats.get(o.id)?.events ?? 0,
    })),
  }
}

/** Все теги с числом контактов — подсказка при вводе и фильтр в списке */
export async function loadLeadTags(): Promise<LeadTagCount[]> {
  const rows = await useDb()
    .select({
      tag: leadTags.tag,
      auto: sql<boolean>`bool_or(${leadTags.auto})`,
      count: sql<number>`count(*)::int`,
    })
    .from(leadTags)
    .groupBy(leadTags.tag)
    .orderBy(desc(sql`count(*)`), leadTags.tag)
  return rows
}

/**
 * Сохранить контакт: имя, почта, телефон, язык, свои теги; отписать от рассылки.
 * Включить рассылку нельзя — только сам гость (8.2). Автотеги не трогаем.
 */
export async function saveLead(id: number, input: LeadInput) {
  const [lead] = await useDb().select().from(leads).where(eq(leads.id, id)).limit(1)
  if (!lead) throw createError({ statusCode: 404, message: 'Контакт не найден' })

  const key = phoneKey(input.phone)
  if (!input.email && !key) {
    throw createError({
      statusCode: 400,
      message: 'Нужна почта или телефон',
      data: { issues: [{ path: 'email', message: 'Нужна почта или телефон' }] },
    })
  }
  if (input.email && input.email !== lead.email) {
    const [taken] = await useDb()
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.email, input.email))
      .limit(1)
    if (taken) {
      throw createError({
        statusCode: 409,
        message: `Почта ${input.email} уже у другого контакта`,
        data: { issues: [{ path: 'email', message: 'Эта почта уже у другого контакта' }] },
      })
    }
  }

  await useDb().transaction(async (tx) => {
    await tx
      .update(leads)
      .set({
        name: input.name,
        email: input.email,
        phone: input.phone,
        phoneKey: key,
        locale: input.locale,
        ...(input.marketingOff && lead.marketing !== 'no'
          ? {
              marketing: 'no' as const,
              marketingAt: new Date(),
              marketingSource: 'отписан в админке',
            }
          : {}),
      })
      .where(eq(leads.id, id))

    const autoTags = (
      await tx
        .select()
        .from(leadTags)
        .where(and(eq(leadTags.leadId, id), eq(leadTags.auto, true)))
    ).map((t) => t.tag)
    // Свои теги заменяем целиком; совпавший с автотегом не дублируем
    await tx.delete(leadTags).where(and(eq(leadTags.leadId, id), eq(leadTags.auto, false)))
    const manual = [...new Set(input.tags.map((t) => t.trim()))].filter(
      (t) => t && !autoTags.includes(t),
    )
    if (manual.length) {
      await tx.insert(leadTags).values(manual.map((tag) => ({ leadId: id, tag, auto: false })))
    }
  })
}

/** Контакт заявки для её карточки: имя, сколько обращений, теги */
export async function leadForRequest(leadId: number | null) {
  if (!leadId) return null
  const lead = await useDb().query.leads.findFirst({
    where: eq(leads.id, leadId),
    with: { tags: true },
  })
  if (!lead) return null
  const stats = (await statsFor([leadId])).get(leadId)
  return {
    id: lead.id,
    name: lead.name,
    events: stats?.events ?? 0,
    since: lead.createdAt.toISOString(),
    tags: lead.tags.filter((t) => t.auto).map((t) => t.tag),
  }
}
