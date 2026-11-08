// Разделы бокового меню админки, по группам — как в прототипе (admin/*.html).
// Используется в layouts/admin.vue.
import type { AdminIconName } from '~/components/AdminIcon.vue'

export interface AdminNavItem {
  to: string
  label: string
  icon: AdminIconName
}

export interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

export const adminNav: AdminNavGroup[] = [
  {
    title: 'Работа',
    items: [
      { to: '/admin', label: 'Заявки', icon: 'requests' },
      { to: '/admin/orders', label: 'Заказы', icon: 'orders' },
    ],
  },
  {
    title: 'Содержимое',
    items: [
      { to: '/admin/menu', label: 'Меню', icon: 'menu' },
      { to: '/admin/materials', label: 'Новости и мероприятия', icon: 'materials' },
      { to: '/admin/products', label: 'Товары', icon: 'products' },
      { to: '/admin/gallery', label: 'Галерея', icon: 'gallery' },
    ],
  },
  {
    title: 'Люди',
    items: [
      { to: '/admin/leads', label: 'Лиды', icon: 'leads' },
      { to: '/admin/staff', label: 'Сотрудники', icon: 'staff' },
    ],
  },
  {
    title: 'Сайт',
    items: [
      { to: '/admin/contacts', label: 'Контакты и часы', icon: 'contacts' },
      { to: '/admin/settings', label: 'Настройки сайта', icon: 'settings' },
    ],
  },
]
