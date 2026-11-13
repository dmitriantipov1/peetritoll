// Страницы-материалы на сайте (5.7): /ru/privacy, /et/privacy… — опубликованные материалы типа «страница».
// Адрес у каждого языка свой (слаг перевода); для переключателя языков отдаём слаги всех языков показа.
// Доступно в серверном коде без импорта.
import { and, eq } from 'drizzle-orm'
import { materials, materialTranslations } from '../db/schema'
import { materialStatus } from '#shared/materials'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'
import type { SitePage } from '#shared/site-pages'

export async function loadSitePage(locale: ContentLocale, slug: string): Promise<SitePage | null> {
  const db = useDb()
  const [hit] = await db
    .select({ materialId: materialTranslations.materialId })
    .from(materialTranslations)
    .where(and(eq(materialTranslations.locale, locale), eq(materialTranslations.slug, slug)))
    .limit(1)
  if (!hit) return null

  const m = await db.query.materials.findFirst({
    where: and(eq(materials.id, hit.materialId), eq(materials.type, 'page')),
    with: { translations: true, cover: true },
  })
  // Черновик, запланированная, в архиве или не для этого языка — для гостя страницы нет
  if (!m || !m.locales.includes(locale)) return null
  const status = materialStatus({
    state: m.state,
    publishAt: m.publishAt?.toISOString() ?? null,
    event: null,
  })
  if (status !== 'published') return null

  const t = m.translations.find((tr) => tr.locale === locale)!
  return {
    title: t.title,
    lead: t.lead,
    body: t.body,
    cover: m.cover ? toMediaImage(m.cover) : null,
    updatedAt: m.updatedAt.toISOString(),
    slugs: Object.fromEntries(
      contentLocales
        .filter((l) => m.locales.includes(l))
        .flatMap((l) => {
          const tr = m.translations.find((x) => x.locale === l)
          return tr ? [[l, tr.slug]] : []
        }),
    ),
  }
}
