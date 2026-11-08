// Материалы (5.7): список и карточка для админки, сохранение. Доступно в серверном коде без импорта.
import { and, desc, eq, ne } from 'drizzle-orm'
import { materialEvents, materials, materialTranslations, media } from '../db/schema'
import {
  materialStatus,
  reservedPageSlugs,
  type AdminMaterial,
  type AdminMaterialRow,
  type AdminMaterialTranslation,
  type MaterialInput,
} from '#shared/materials'
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'
import { toMediaImage } from '#shared/media'
import { slugify } from '#shared/slug'
import { fromTallinnLocal, toTallinnLocal } from '#shared/dates'

const localeNames: Record<ContentLocale, string> = {
  et: 'эстонский',
  en: 'английский',
  ru: 'русский',
}

/** Перевод для подписи в админке: русский, иначе эстонский, иначе любой */
function adminPick<T>(translations: Localized<T>): T | undefined {
  return translations.ru ?? translations.et ?? Object.values(translations)[0]
}

type TranslationRow = typeof materialTranslations.$inferSelect

function translationsOf(rows: TranslationRow[]) {
  const result: Localized<AdminMaterialTranslation> = {}
  for (const t of rows) {
    result[t.locale] = {
      title: t.title,
      slug: t.slug,
      lead: t.lead ?? '',
      body: t.body,
      priceNote: t.priceNote ?? '',
    }
  }
  return result
}

/** Все материалы для списка: сначала новые по дате мероприятия или выхода */
export async function loadAdminMaterials(): Promise<AdminMaterialRow[]> {
  const rows = await useDb().query.materials.findMany({
    with: {
      translations: { columns: { locale: true, title: true, slug: true } },
      event: { columns: { date: true, startTime: true, archiveAfter: true } },
    },
    orderBy: [desc(materials.updatedAt)],
  })
  const now = new Date()
  const list = rows.map((m): AdminMaterialRow => {
    const byLocale: Localized<{ title: string; slug: string }> = {}
    for (const t of m.translations) byLocale[t.locale] = t
    const shown = adminPick(byLocale)
    const publishAt = m.publishAt?.toISOString() ?? null
    return {
      id: m.id,
      type: m.type,
      status: materialStatus({ state: m.state, publishAt, event: m.event ?? null }, now),
      title: shown?.title ?? '',
      slug: shown?.slug ?? '',
      publishAt,
      updatedAt: m.updatedAt.toISOString(),
      locales: contentLocales.filter((l) => m.locales.includes(l)),
      translated: contentLocales.filter((l) => byLocale[l]),
      event: m.event ? { date: m.event.date, startTime: m.event.startTime } : null,
    }
  })
  // Дата строки: у мероприятия — когда проходит, у остального — выход или последняя правка
  const sortKey = (m: AdminMaterialRow) =>
    m.event ? `${m.event.date}T${m.event.startTime ?? '00:00'}` : (m.publishAt ?? m.updatedAt)
  return list.sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
}

/** Материал для карточки; нет такого — 404. */
export async function loadAdminMaterial(id: number): Promise<AdminMaterial> {
  const m = await useDb().query.materials.findFirst({
    where: eq(materials.id, id),
    with: {
      translations: true,
      event: true,
      cover: true,
      updatedByUser: { columns: { name: true } },
    },
  })
  if (!m) throw createError({ statusCode: 404, message: 'Материал не найден' })
  const publishAt = m.publishAt?.toISOString() ?? null
  const event = m.event
    ? {
        kind: m.event.kind,
        date: m.event.date,
        startTime: m.event.startTime,
        place: m.event.place,
        registrationOpen: m.event.registrationOpen,
        capacity: m.event.capacity,
        archiveAfter: m.event.archiveAfter,
      }
    : null
  return {
    id: m.id,
    type: m.type,
    state: m.state,
    status: materialStatus({ state: m.state, publishAt, event }),
    publishAt: m.publishAt ? toTallinnLocal(m.publishAt) : null,
    locales: contentLocales.filter((l) => m.locales.includes(l)),
    cover: m.cover ? toMediaImage(m.cover) : null,
    translations: translationsOf(m.translations),
    event,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    updatedByName: m.updatedByUser?.name ?? null,
  }
}

/** id из адреса /api/admin/materials/:id */
export function materialIdParam(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Неверный номер материала' })
  }
  return id
}

function badRequest(message: string, path: string) {
  return createError({ statusCode: 400, message, data: { issues: [{ path, message }] } })
}

/**
 * Создать (materialId = null) или сохранить материал целиком — в одной транзакции.
 * Пустой адрес собираем из заголовка; занятый адрес — понятная ошибка, а не сбой базы.
 */
export async function saveMaterial(
  materialId: number | null,
  input: MaterialInput,
  userId: number,
) {
  const translations = contentLocales.flatMap((locale) => {
    const t = input.translations[locale]
    if (!t?.title) return []
    const slug = t.slug || slugify(t.title)
    if (!slug) {
      throw badRequest(
        `Адрес (${localeNames[locale]}): заполните латиницей — из заголовка его не собрать`,
        `translations.${locale}.slug`,
      )
    }
    if (input.type === 'page' && (reservedPageSlugs as readonly string[]).includes(slug)) {
      throw badRequest(
        `Адрес «${slug}» занят разделом сайта — выберите другой`,
        `translations.${locale}.slug`,
      )
    }
    return [
      {
        locale,
        title: t.title,
        slug,
        lead: t.lead || null,
        body: cleanRichText(t.body),
        priceNote: input.type === 'event' ? t.priceNote || null : null,
      },
    ]
  })

  return await useDb().transaction(async (tx) => {
    if (input.coverId) {
      const [found] = await tx
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, input.coverId))
      if (!found) throw badRequest('Обложка не найдена — загрузите заново', 'coverId')
    }

    // Адрес на языке — у одного материала
    for (const t of translations) {
      const [taken] = await tx
        .select({ materialId: materialTranslations.materialId, title: materialTranslations.title })
        .from(materialTranslations)
        .where(
          and(
            eq(materialTranslations.locale, t.locale),
            eq(materialTranslations.slug, t.slug),
            materialId === null ? undefined : ne(materialTranslations.materialId, materialId),
          ),
        )
      if (taken) {
        throw badRequest(
          `Адрес «${t.slug}» (${localeNames[t.locale]}) уже у материала «${taken.title}»`,
          `translations.${t.locale}.slug`,
        )
      }
    }

    let publishAt = input.publishAt ? fromTallinnLocal(input.publishAt) : null
    let id: number
    if (materialId === null) {
      // Опубликовали сразу, без даты — вышло сейчас
      if (input.state === 'published' && !publishAt) publishAt = new Date()
      const [created] = await tx
        .insert(materials)
        .values({
          type: input.type,
          state: input.state,
          publishAt,
          locales: input.locales,
          coverId: input.coverId,
          updatedBy: userId,
        })
        .returning({ id: materials.id })
      id = created!.id
    } else {
      const [current] = await tx
        .select({ type: materials.type, publishAt: materials.publishAt })
        .from(materials)
        .where(eq(materials.id, materialId))
      if (!current) throw createError({ statusCode: 404, message: 'Материал не найден' })
      if (input.state === 'published' && !publishAt) publishAt = current.publishAt ?? new Date()
      await tx
        .update(materials)
        .set({
          type: input.type,
          state: input.state,
          publishAt,
          locales: input.locales,
          coverId: input.coverId,
          updatedBy: userId,
        })
        .where(eq(materials.id, materialId))
      id = materialId
    }

    await tx.delete(materialTranslations).where(eq(materialTranslations.materialId, id))
    await tx
      .insert(materialTranslations)
      .values(translations.map((t) => ({ ...t, materialId: id })))

    await tx.delete(materialEvents).where(eq(materialEvents.materialId, id))
    if (input.event) {
      await tx.insert(materialEvents).values({
        materialId: id,
        ...input.event,
        // Без записи лимит мест не нужен
        capacity: input.event.registrationOpen ? input.event.capacity : null,
      })
    }
    return id
  })
}

/** Где показывать — переключатели языков прямо в строке списка (8.5) */
export async function setMaterialLocales(id: number, locales: ContentLocale[], userId: number) {
  const [row] = await useDb()
    .update(materials)
    .set({ locales: contentLocales.filter((l) => locales.includes(l)), updatedBy: userId })
    .where(eq(materials.id, id))
    .returning({ id: materials.id })
  if (!row) throw createError({ statusCode: 404, message: 'Материал не найден' })
}

export async function deleteMaterial(id: number) {
  const [row] = await useDb()
    .delete(materials)
    .where(eq(materials.id, id))
    .returning({ id: materials.id })
  if (!row) throw createError({ statusCode: 404, message: 'Материал не найден' })
}
