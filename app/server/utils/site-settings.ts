// Настройки сайта: разделы и языки, уведомления, мероприятия и афиши (settings: sections,
// notifications, events). Доступно в серверном коде без импорта.
import { eq } from 'drizzle-orm'
import { media } from '../db/schema'
import {
  defaultEvents,
  defaultNotifications,
  defaultSections,
  eventsSchema,
  notificationsSchema,
  sectionsSchema,
  type AdminSiteSettings,
  type SectionKey,
  type SiteSettingsInput,
} from '#shared/site-settings'
import { toMediaImage } from '#shared/media'

export function readSections() {
  return readSetting('sections', sectionsSchema, defaultSections)
}

/** Включить или выключить один раздел, не трогая остальные (переключатель в «Дневном меню») */
export async function setSectionEnabled(key: SectionKey, enabled: boolean, userId: number) {
  const sections = await readSections()
  sections[key] = { ...sections[key], enabled }
  await writeSetting('sections', sections, userId)
}

export async function loadSiteSettings(): Promise<AdminSiteSettings> {
  const events = await readSetting('events', eventsSchema, defaultEvents)
  let defaultPoster = null
  if (events.defaultPosterId) {
    const [row] = await useDb().select().from(media).where(eq(media.id, events.defaultPosterId))
    defaultPoster = row ? toMediaImage(row) : null
  }
  return {
    sections: await readSections(),
    notifications: await readSetting('notifications', notificationsSchema, defaultNotifications),
    events: { ...events, defaultPoster },
  }
}

export async function saveSiteSettings(input: SiteSettingsInput, userId: number) {
  if (input.events.defaultPosterId) {
    const [found] = await useDb()
      .select({ id: media.id })
      .from(media)
      .where(eq(media.id, input.events.defaultPosterId))
    if (!found)
      throw createError({ statusCode: 400, message: 'Афиша не найдена — загрузите заново' })
  }
  await writeSetting('sections', input.sections, userId)
  await writeSetting('notifications', input.notifications, userId)
  await writeSetting('events', input.events, userId)
  return await loadSiteSettings()
}
