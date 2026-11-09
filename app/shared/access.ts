// Права в админке (5.2 в требованиях, экран — admin/staff-user.html прототипа).
// Общий файл: им пользуются и сервер (проверка запросов), и браузер (меню, страницы).
//
// Три роли (решение 08.11.2026, 5.2):
// - админ — всё, включая учётные записи владельцев и админов (разработчик, поддержка);
// - владелец — всё, включая сотрудников и их права (заказчица);
// - сотрудник — только выданные разделы, у каждого три уровня: нет доступа, смотрит, правит.
// note — подсказка под названием раздела на экране прав.

export const accessLevels = ['none', 'view', 'edit'] as const
export type AccessLevel = (typeof accessLevels)[number]

export const sections = {
  'requests.table': { label: 'Заявки: бронь стола', group: 'Работа' },
  'requests.banquet': { label: 'Заявки: банкеты', group: 'Работа', note: 'с расчётом и Excel' },
  'requests.lunch': { label: 'Заявки: предзаказ обедов', group: 'Работа' },
  'requests.tours': { label: 'Заявки: экскурсии, Pakri Express, радиогиды', group: 'Работа' },
  'requests.events': { label: 'Заявки: регистрация на мероприятия', group: 'Работа' },
  orders: { label: 'Заказы магазина', group: 'Работа' },
  menu: {
    label: 'Меню: основное, банкетное, групповое',
    group: 'Содержимое',
    note: 'цены и состав',
  },
  'menu.lunch': { label: 'Меню: дневное', group: 'Содержимое', note: 'обеды недели' },
  materials: { label: 'Новости и мероприятия', group: 'Содержимое' },
  products: { label: 'Товары', group: 'Содержимое' },
  gallery: { label: 'Галерея', group: 'Содержимое' },
  leads: { label: 'Лиды', group: 'Люди и сайт', note: 'почта и телефоны гостей' },
  contacts: { label: 'Контакты и часы', group: 'Люди и сайт' },
  settings: { label: 'Настройки сайта', group: 'Люди и сайт', note: 'разделы, уведомления' },
  // Только админ и владелец, сотруднику не выдаётся
  staff: { label: 'Сотрудники', group: 'Люди и сайт', note: 'только админ и владелец' },
} as const satisfies Record<string, { label: string; group: string; note?: string }>

export type Section = keyof typeof sections
export const sectionKeys = Object.keys(sections) as Section[]

/** Права сотрудника: уровень по каждому разделу. Чего нет — «нет доступа». */
export type Permissions = Partial<Record<Section, AccessLevel>>

export const roles = {
  admin: 'Админ',
  owner: 'Владелец',
  staff: 'Сотрудник',
} as const

export type Role = keyof typeof roles
export const roleKeys = Object.keys(roles) as Role[]

/** Админ и владелец: доступ ко всем разделам без отдельной выдачи прав. */
export function hasFullAccess(role: Role): boolean {
  return role === 'admin' || role === 'owner'
}

/** Уровень доступа к разделу с учётом роли. Раздел «Сотрудники» — только админу и владельцу. */
export function accessTo(role: Role, permissions: Permissions, section: Section): AccessLevel {
  if (hasFullAccess(role)) return 'edit'
  if (section === 'staff') return 'none'
  return permissions[section] ?? 'none'
}

/** Хватает ли уровня: «правит» включает «смотрит». */
export function allows(level: AccessLevel, needed: Exclude<AccessLevel, 'none'>): boolean {
  return needed === 'view' ? level !== 'none' : level === 'edit'
}

/** Есть ли доступ хотя бы к одному из разделов (для пунктов меню, где разделов несколько). */
export function canSeeAny(role: Role, permissions: Permissions, list: readonly Section[]): boolean {
  return list.some((section) => allows(accessTo(role, permissions, section), 'view'))
}
