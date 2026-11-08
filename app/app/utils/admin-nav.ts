// Разделы бокового меню админки, по группам — как в прототипе (admin/*.html).
// access — разделы прав (shared/access.ts): пункт виден, если есть доступ хотя бы к одному.
// Используется в layouts/admin.vue и при входе — куда вести сотрудника.
import type { AdminIconName } from '~/components/AdminIcon.vue'
import type { Section } from '#shared/access'

export interface AdminNavItem {
  to: string
  label: string
  icon: AdminIconName
  access: readonly Section[]
}

export interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

export const requestSections = [
  'requests.table',
  'requests.banquet',
  'requests.lunch',
  'requests.tours',
  'requests.events',
] as const satisfies readonly Section[]

export const adminNav: AdminNavGroup[] = [
  {
    title: 'Работа',
    items: [
      { to: '/admin', label: 'Заявки', icon: 'requests', access: requestSections },
      { to: '/admin/orders', label: 'Заказы', icon: 'orders', access: ['orders'] },
    ],
  },
  {
    title: 'Содержимое',
    items: [
      { to: '/admin/menu', label: 'Меню', icon: 'menu', access: ['menu', 'menu.lunch'] },
      {
        to: '/admin/materials',
        label: 'Новости и мероприятия',
        icon: 'materials',
        access: ['materials'],
      },
      { to: '/admin/products', label: 'Товары', icon: 'products', access: ['products'] },
      { to: '/admin/gallery', label: 'Галерея', icon: 'gallery', access: ['gallery'] },
    ],
  },
  {
    title: 'Люди',
    items: [
      { to: '/admin/leads', label: 'Лиды', icon: 'leads', access: ['leads'] },
      { to: '/admin/staff', label: 'Сотрудники', icon: 'staff', access: ['staff'] },
    ],
  },
  {
    title: 'Сайт',
    items: [
      {
        to: '/admin/contacts',
        label: 'Контакты и часы',
        icon: 'contacts',
        access: ['contacts'],
      },
      { to: '/admin/settings', label: 'Настройки сайта', icon: 'settings', access: ['settings'] },
    ],
  },
]

/** Первый пункт меню, доступный сотруднику, — куда вести после входа. */
export function firstAllowedPath(canAny: (list: readonly Section[]) => boolean): string {
  for (const group of adminNav) {
    for (const item of group.items) if (canAny(item.access)) return item.to
  }
  return '/admin'
}
