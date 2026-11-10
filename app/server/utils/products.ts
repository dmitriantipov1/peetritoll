// Карточка товара в админке (7.3, 7.4, 8.5): загрузить, создать, сохранить целиком —
// переводы, фото, варианты. Файлы цифровых вариантов — server/utils/product-files.ts.
// Доступно в серверном коде без импорта.
import { and, asc, eq, inArray, max, ne } from 'drizzle-orm'
import {
  media,
  productFiles,
  productPhotos,
  products,
  productTranslations,
  productVariants,
  productVariantTranslations,
  shopCategories,
  users,
} from '../db/schema'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'
import type { Localized } from '#shared/menu'
import type {
  AdminProduct,
  AdminProductFile,
  AdminProductTranslation,
  ProductInput,
} from '#shared/shop'

const localeNames: Record<ContentLocale, string> = {
  et: 'эстонский',
  en: 'английский',
  ru: 'русский',
}

export async function loadAdminProduct(id: number): Promise<AdminProduct> {
  const p = await useDb().query.products.findFirst({
    where: eq(products.id, id),
    with: {
      translations: true,
      photos: { with: { media: true }, orderBy: [asc(productPhotos.sort)] },
      variants: {
        with: { translations: true, files: true },
        orderBy: [asc(productVariants.sort), asc(productVariants.id)],
      },
    },
  })
  if (!p) throw createError({ statusCode: 404, message: 'Товар не найден' })

  const [editor] = p.updatedBy
    ? await useDb()
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, p.updatedBy))
        .limit(1)
    : []

  const translations: Localized<AdminProductTranslation> = {}
  for (const t of p.translations) {
    translations[t.locale] = {
      name: t.name,
      slug: t.slug,
      lead: t.lead ?? '',
      description: t.description ?? '',
      facts: t.facts,
    }
  }

  return {
    id: p.id,
    categoryId: p.categoryId,
    state: p.state,
    locales: contentLocales.filter((l) => p.locales.includes(l)),
    translations,
    photos: p.photos.map((ph) => toMediaImage(ph.media)),
    variants: p.variants.map((v) => {
      const labels: Localized<string> = {}
      for (const t of v.translations) labels[t.locale] = t.label
      const files: Localized<AdminProductFile> = {}
      for (const f of v.files) {
        files[f.locale] = {
          id: f.id,
          filename: f.filename,
          size: f.size,
          mime: f.mime,
          uploadedAt: f.uploadedAt.toISOString(),
        }
      }
      return {
        id: v.id,
        kind: v.kind,
        priceCents: v.priceCents,
        stock: v.stock,
        delivery: v.delivery,
        isAvailable: v.isAvailable,
        labels,
        files,
      }
    }),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    updatedByName: editor?.name ?? null,
  }
}

function bad(message: string, path: string, status = 400): never {
  throw createError({ statusCode: status, message, data: { issues: [{ path, message }] } })
}

/**
 * Сохранить товар целиком: новый (id = null) или существующий. Переводы и фото заменяются,
 * варианты — по номеру: есть в форме — обновляем, новые — добавляем, пропавшие — удаляем
 * вместе с их файлами. Возвращает номер товара и пути файлов, которые надо стереть с диска.
 */
export async function saveProduct(id: number | null, input: ProductInput, userId: number) {
  const db = useDb()
  const [category] = await db
    .select({ id: shopCategories.id })
    .from(shopCategories)
    .where(eq(shopCategories.id, input.categoryId))
    .limit(1)
  if (!category) bad('Выберите категорию', 'categoryId')

  // Адрес товара уникален в пределах языка
  for (const locale of contentLocales) {
    const t = input.translations[locale]
    if (!t) continue
    const [taken] = await db
      .select({ productId: productTranslations.productId, name: productTranslations.name })
      .from(productTranslations)
      .where(
        and(
          eq(productTranslations.locale, locale),
          eq(productTranslations.slug, t.slug),
          ...(id ? [ne(productTranslations.productId, id)] : []),
        ),
      )
      .limit(1)
    if (taken) {
      bad(
        `Адрес «${t.slug}» (${localeNames[locale]}) уже у товара «${taken.name}»`,
        `translations.${locale}.slug`,
        409,
      )
    }
  }

  if (input.photoIds.length) {
    const found = await db
      .select({ id: media.id })
      .from(media)
      .where(inArray(media.id, input.photoIds))
    if (found.length !== new Set(input.photoIds).size) bad('Одно из фото не найдено', 'photoIds')
  }

  const removedFiles: string[] = []
  const productId = await db.transaction(async (tx) => {
    let pid = id
    const values = {
      categoryId: input.categoryId,
      state: input.state,
      locales: contentLocales.filter((l) => input.locales.includes(l)),
      updatedBy: userId,
    }
    if (pid === null) {
      const [last] = await tx.select({ value: max(products.sort) }).from(products)
      const [row] = await tx
        .insert(products)
        .values({ ...values, sort: (last?.value ?? -1) + 1 })
        .returning({ id: products.id })
      pid = row!.id
    } else {
      const [row] = await tx
        .update(products)
        .set(values)
        .where(eq(products.id, pid))
        .returning({ id: products.id })
      if (!row) throw createError({ statusCode: 404, message: 'Товар не найден' })
    }

    await tx.delete(productTranslations).where(eq(productTranslations.productId, pid))
    await tx.insert(productTranslations).values(
      contentLocales
        .filter((l) => input.translations[l])
        .map((locale) => {
          const t = input.translations[locale]!
          return { productId: pid!, locale, ...t }
        }),
    )

    await tx.delete(productPhotos).where(eq(productPhotos.productId, pid))
    if (input.photoIds.length) {
      await tx
        .insert(productPhotos)
        .values(
          [...new Set(input.photoIds)].map((mediaId, sort) => ({ productId: pid!, mediaId, sort })),
        )
    }

    // Варианты: чужой номер в форме — ошибка, а не тихое создание нового
    const existing = await tx
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, pid))
    const known = new Set(existing.map((v) => v.id))
    const kept = new Set<number>()
    for (const [sort, v] of input.variants.entries()) {
      const fields = {
        sort,
        kind: v.kind,
        priceCents: v.priceCents,
        stock: v.stock,
        delivery: v.delivery,
        isAvailable: v.isAvailable,
      }
      let vid: number
      if (v.id !== null) {
        if (!known.has(v.id)) bad('Вариант не от этого товара — обновите страницу', 'variants', 409)
        await tx.update(productVariants).set(fields).where(eq(productVariants.id, v.id))
        vid = v.id
        kept.add(vid)
      } else {
        const [row] = await tx
          .insert(productVariants)
          .values({ productId: pid, ...fields })
          .returning({ id: productVariants.id })
        vid = row!.id
      }
      await tx
        .delete(productVariantTranslations)
        .where(eq(productVariantTranslations.variantId, vid))
      const labels = contentLocales
        .filter((l) => v.labels[l]?.trim())
        .map((locale) => ({ variantId: vid, locale, label: v.labels[locale]!.trim() }))
      if (labels.length) await tx.insert(productVariantTranslations).values(labels)
      // Вариант стал физическим — файлы ему больше не нужны
      if (v.kind === 'physical') {
        const files = await tx
          .delete(productFiles)
          .where(eq(productFiles.variantId, vid))
          .returning({ path: productFiles.path })
        removedFiles.push(...files.map((f) => f.path))
      }
    }

    const removed = [...known].filter((v) => !kept.has(v))
    if (removed.length) {
      const files = await tx
        .select({ path: productFiles.path })
        .from(productFiles)
        .where(inArray(productFiles.variantId, removed))
      removedFiles.push(...files.map((f) => f.path))
      await tx.delete(productVariants).where(inArray(productVariants.id, removed))
    }
    return pid
  })

  // Файлы — после фиксации в базе: откат транзакции не должен оставить запись без файла
  await removeProductFiles(removedFiles)
  return productId
}
