// Контакты и часы работы: чтение и запись (таблица settings, ключи hours и contacts).
// Доступно в серверном коде без импорта.
import {
  contactsSettingsSchema,
  defaultContacts,
  defaultHours,
  hoursSettingsSchema,
  type AdminContacts,
} from '#shared/contacts'

export async function loadContacts(): Promise<AdminContacts> {
  return {
    hours: await readSetting('hours', hoursSettingsSchema, defaultHours),
    contacts: await readSetting('contacts', contactsSettingsSchema, defaultContacts),
  }
}

export async function saveContacts(value: AdminContacts, userId: number) {
  // Особые дни храним по порядку дат — так их и показываем
  const hours = {
    ...value.hours,
    specialDays: [...value.hours.specialDays].sort((a, b) => a.date.localeCompare(b.date)),
  }
  await writeSetting('hours', hours, userId)
  await writeSetting('contacts', value.contacts, userId)
  return { hours, contacts: value.contacts }
}
