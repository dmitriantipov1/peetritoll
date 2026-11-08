// Дневное меню (меню дня, 7.1): на каждый будний день суп и горячее — текстом на трёх языках,
// три цены: суп, горячее, обед целиком. С основным меню не связано.
// Нет строки на дату — меню на этот день нет. Настройки дневного меню — в settings (ключ lunch).
import { check, date, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import { users } from './users'

export const lunchDays = pgTable(
  'lunch_days',
  {
    // Дата дня, «2026-11-09». Строкой: дата без времени и часового пояса
    date: date('date', { mode: 'string' }).primaryKey(),
    // Цены в центах; пусто — этого блюда в тот день нет
    soupCents: integer('soup_cents'),
    mainCents: integer('main_cents'),
    // Обед целиком (суп, горячее, напиток) — обычно дешевле суммы; пусто — только по отдельности
    fullCents: integer('full_cents'),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      'lunch_days_prices_positive',
      sql`coalesce(${t.soupCents}, 0) >= 0 and coalesce(${t.mainCents}, 0) >= 0 and coalesce(${t.fullCents}, 0) >= 0`,
    ),
  ],
)

export const lunchDayTranslations = pgTable(
  'lunch_day_translations',
  {
    date: date('date', { mode: 'string' })
      .notNull()
      .references(() => lunchDays.date, { onDelete: 'cascade', onUpdate: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    soup: text('soup'),
    main: text('main'),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.locale] }),
    check('lunch_day_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)
