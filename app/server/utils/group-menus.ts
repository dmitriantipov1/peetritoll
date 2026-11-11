// Групповое меню — «Трапезы групп»: список, сохранение, видимость, удаление, настройки.
// Доступно в серверном коде без импорта.
import { and, asc, eq, max, ne } from 'drizzle-orm'
import { groupMenus, groupMenuTranslations } from '../db/schema'
import {
  defaultGroupSettings,
  groupSettingsSchema,
  type AdminGroupMenu,
  type AdminGroupMenus,
  type GroupMenuInput,
  type GroupSettings,
} from '#shared/group-menus'
import type { Localized } from '#shared/menu'
import type { ContentLocale } from '#shared/locales'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export const GROUP_SETTINGS_KEY = 'group'

export function readGroupSettings(): Promise<GroupSettings> {
  return readSetting(GROUP_SETTINGS_KEY, groupSettingsSchema, defaultGroupSettings)
}

export async function saveGroupSettings(value: GroupSettings, userId: number) {
  await writeSetting(GROUP_SETTINGS_KEY, value, userId)
  return value
}

type MenuRow = typeof groupMenus.$inferSelect & {
  translations: (typeof groupMenuTranslations.$inferSelect)[]
}

function toAdmin(row: MenuRow): AdminGroupMenu {
  const pick = (key: 'name' | 'items') =>
    Object.fromEntries(
      row.translations.filter((t) => t[key]).map((t) => [t.locale, t[key]]),
    ) as Localized<string>
  return {
    id: row.id,
    number: row.number,
    priceCents: row.priceCents,
    isVisible: row.isVisible,
    names: pick('name'),
    items: pick('items'),
  }
}

export async function loadGroupMenus(): Promise<AdminGroupMenus> {
  const rows = await useDb().query.groupMenus.findMany({
    orderBy: [asc(groupMenus.number), asc(groupMenus.id)],
    with: { translations: true },
  })
  return { menus: rows.map(toAdmin), settings: await readGroupSettings() }
}

/** Обед по номеру записи — для расчёта заявки; нет — null */
export async function findGroupMenu(id: number) {
  const row = await useDb().query.groupMenus.findFirst({
    where: eq(groupMenus.id, id),
    with: { translations: true },
  })
  return row ? toAdmin(row) : null
}

/** Следующий свободный номер — для нового обеда */
export async function nextGroupMenuNumber() {
  const [row] = await useDb()
    .select({ value: max(groupMenus.number) })
    .from(groupMenus)
  return (row?.value ?? 0) + 1
}

async function assertNumberFree(tx: Tx, number: number, id: number | null) {
  const [taken] = await tx
    .select({ id: groupMenus.id })
    .from(groupMenus)
    .where(
      id === null
        ? eq(groupMenus.number, number)
        : and(eq(groupMenus.number, number), ne(groupMenus.id, id)),
    )
    .limit(1)
  if (taken) {
    throw createError({
      statusCode: 409,
      message: `Меню № ${number} уже есть. Выберите другой номер.`,
      data: { issues: [{ path: 'number', message: `Меню № ${number} уже есть` }] },
    })
  }
}

async function replaceTexts(tx: Tx, id: number, input: GroupMenuInput) {
  await tx.delete(groupMenuTranslations).where(eq(groupMenuTranslations.menuId, id))
  // Язык без названия не сохраняем — состав без названия гостю не показать
  const rows = Object.entries(input.names)
    .filter(([, name]) => name)
    .map(([locale, name]) => ({
      menuId: id,
      locale: locale as ContentLocale,
      name: name!,
      items: input.items[locale as ContentLocale] || null,
    }))
  await tx.insert(groupMenuTranslations).values(rows)
}

/** Создать (id = null) или сохранить обед. Возвращает id */
export async function saveGroupMenu(id: number | null, input: GroupMenuInput, userId: number) {
  return await useDb().transaction(async (tx) => {
    await assertNumberFree(tx, input.number, id)
    const fields = {
      number: input.number,
      priceCents: input.priceCents,
      isVisible: input.isVisible,
      updatedBy: userId,
    }
    if (id === null) {
      const [row] = await tx.insert(groupMenus).values(fields).returning({ id: groupMenus.id })
      await replaceTexts(tx, row!.id, input)
      return row!.id
    }
    const [row] = await tx
      .update(groupMenus)
      .set(fields)
      .where(eq(groupMenus.id, id))
      .returning({ id: groupMenus.id })
    if (!row) throw createError({ statusCode: 404, message: 'Обед не найден' })
    await replaceTexts(tx, id, input)
    return id
  })
}

export async function setGroupMenuVisibility(id: number, isVisible: boolean, userId: number) {
  const [row] = await useDb()
    .update(groupMenus)
    .set({ isVisible, updatedBy: userId })
    .where(eq(groupMenus.id, id))
    .returning({ id: groupMenus.id })
  if (!row) throw createError({ statusCode: 404, message: 'Обед не найден' })
}

/** Удаление не трогает заявки: в них обед снимком — название и цена на момент отправки */
export async function deleteGroupMenu(id: number) {
  const [row] = await useDb()
    .delete(groupMenus)
    .where(eq(groupMenus.id, id))
    .returning({ id: groupMenus.id })
  if (!row) throw createError({ statusCode: 404, message: 'Обед не найден' })
}
