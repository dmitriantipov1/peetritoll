// Тестовые заявки всех видов — чтобы было что показать в списке и карточке, пока формы
// сайта не готовы. Почты гостей — *@peetritoll.test: по ним тестовые заявки видно и можно убрать.
// Если тестовые заявки уже есть, ничего не делает (payload { "force": true } — добавить ещё,
// { "force": true, "one": true } — только одну бронь стола).
// Цены — из текущих каталогов и меню дня, как у настоящей заявки; чего нет — тот вид пропускаем.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run seed:requests
// или в разработке: curl -X POST localhost:3000/_nitro/tasks/seed:requests
import { and, asc, desc, eq, isNotNull, like } from 'drizzle-orm'
import {
  catalogCategories,
  catalogDishes,
  groupMenus,
  lunchDays,
  materials,
  requests,
  users,
} from '../../db/schema'
import { addDays, todayInTallinn } from '#shared/dates'
import type { CatalogKind } from '#shared/catalog'
import type { RequestInput } from '#shared/requests'

export default defineTask({
  meta: {
    name: 'seed:requests',
    description: 'Тестовые заявки всех видов (почты *@peetritoll.test)',
  },
  async run({ payload }) {
    const db = useDb()
    const [existing] = await db
      .select({ id: requests.id })
      .from(requests)
      .where(like(requests.email, '%@peetritoll.test'))
      .limit(1)
    if (existing && payload.force !== true) {
      return { result: 'Тестовые заявки уже есть — пропускаю. { "force": true } — добавить ещё' }
    }

    const today = todayInTallinn()
    const skipped: string[] = []
    const created: number[] = []

    async function dishIds(kind: CatalogKind, count: number) {
      const rows = await db
        .select({ id: catalogDishes.id })
        .from(catalogDishes)
        .innerJoin(catalogCategories, eq(catalogCategories.id, catalogDishes.categoryId))
        .where(and(eq(catalogCategories.kind, kind), eq(catalogDishes.isAvailable, true)))
        .orderBy(asc(catalogCategories.sort), asc(catalogDishes.sort))
        .limit(count)
      return rows.map((r) => r.id)
    }

    const add = async (input: RequestInput, consent = true) => {
      created.push(await createRequest(input, { source: consent ? 'site' : 'admin', consent }))
    }

    // Бронь стола — с сайта и внесённая по звонку
    await add({
      type: 'table',
      locale: 'ru',
      name: 'Андрес Тамм',
      phone: '+372 5123 4410',
      email: 'andres.tamm@peetritoll.test',
      comment: 'Если можно, у камина',
      marketingOptIn: false,
      visitDate: addDays(today, 2),
      visitTime: '19:30',
      guests: 4,
      occasion: 'dinner',
    })
    // { "one": true } — одна заявка (бронь стола): проверить письмо и Telegram, не засыпая канал
    if (payload.one === true) {
      return { result: `Создана заявка № ${created[0]}` }
    }
    await add(
      {
        type: 'table',
        locale: 'et',
        name: 'Elena Melnik',
        phone: '+372 5390 4478',
        email: 'elena.melnik@peetritoll.test',
        comment: 'Tähistame aastapäeva',
        marketingOptIn: false,
        visitDate: addDays(today, 1),
        visitTime: '18:30',
        guests: 3,
        occasion: 'birthday',
      },
      false,
    )

    // Банкет и группа — по каталогам
    const banquet = await dishIds('banquet', 6)
    if (banquet.length) {
      await add({
        type: 'banquet',
        locale: 'ru',
        name: 'Марина Койт',
        phone: '+372 5551 2034',
        email: 'marina.koit@peetritoll.test',
        comment: 'Будут дети, нужен детский стул',
        marketingOptIn: true,
        visitDate: addDays(today, 14),
        visitTime: '18:00',
        guests: 24,
        occasion: 'birthday',
        setTier: 'middle',
        items: banquet.map((dishId, i) => ({ dishId, qty: i < 3 ? 24 : 12 })),
      })
    } else skipped.push('банкет — пустой банкетный каталог')

    // Группа — на первый обед «Трапез групп», если он есть; без обеда — «обсудим по телефону»
    const [groupMenu] = await db
      .select({ id: groupMenus.id })
      .from(groupMenus)
      .orderBy(asc(groupMenus.number))
      .limit(1)
    await add({
      type: 'group',
      locale: 'en',
      name: 'Irina Sokolova',
      phone: '+372 5640 1187',
      email: 'irina@peetritoll.test',
      comment: null,
      marketingOptIn: false,
      visitDate: addDays(today, 7),
      visitTime: '13:00',
      guests: 32,
      agency: 'Baltic Tours',
      menuId: groupMenu?.id ?? null,
    })

    // Обед — на последний день, где есть меню с супом и горячим
    const [lunchDay] = await db
      .select({ date: lunchDays.date })
      .from(lunchDays)
      .where(and(isNotNull(lunchDays.soupCents), isNotNull(lunchDays.mainCents)))
      .orderBy(desc(lunchDays.date))
      .limit(1)
    if (lunchDay) {
      await add({
        type: 'lunch',
        locale: 'ru',
        name: 'Олег Соколов',
        phone: '+372 5309 6612',
        email: null,
        comment: null,
        marketingOptIn: false,
        visitDate: lunchDay.date,
        visitTime: '13:00',
        mode: 'pickup',
        items: { soup: 2, main: 2 },
      })
    } else skipped.push('обед — в меню дня нет дня с супом и горячим')

    // Экскурсии
    await add({
      type: 'tour',
      locale: 'ru',
      name: 'Сергей Волков',
      phone: '+372 5308 9921',
      email: 'sergei.volkov@peetritoll.test',
      comment: 'Школьная группа, гид на русском',
      marketingOptIn: false,
      visitDate: addDays(today, 9),
      guests: 18,
      topic: 'exhibition',
    })
    await add({
      type: 'tour',
      locale: 'en',
      name: 'Sarah Miller',
      phone: '+44 7700 900123',
      email: 's.miller@peetritoll.test',
      comment: null,
      marketingOptIn: true,
      visitDate: addDays(today, 20),
      guests: 2,
      topic: 'pakri',
    })

    // Запись на мероприятие — на любое заведённое мероприятие (из админки — без проверки «запись открыта»)
    const [event] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.type, 'event'))
      .orderBy(desc(materials.id))
      .limit(1)
    if (event) {
      created.push(
        await createRequest(
          {
            type: 'event',
            locale: 'et',
            name: 'Kati Saar',
            phone: '+372 5677 2210',
            email: 'kati.saar@peetritoll.test',
            comment: null,
            marketingOptIn: true,
            guests: 2,
            materialId: event.id,
          },
          { source: 'admin' },
        ),
      )
    } else skipped.push('мероприятие — нет ни одного мероприятия')

    // Немного жизни: одна в работе, одна согласована с переносом времени, одна отменена
    // От имени тестового админа — чтобы в истории настоящих людей не появлялись чужие действия
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'test-admin@peetritoll.test'))
      .limit(1)
    if (admin && created.length >= 3) {
      const [first, second, third] = created as [number, number, number]
      await setRequestStatus(first, 'in_progress', admin.id)
      await setRequestStatus(second, 'in_progress', admin.id)
      await updateRequest(
        second,
        { visitTime: '18:00', guests: 2, staffNote: 'Стол 4 у окна' },
        admin.id,
        'по звонку гостя',
      )
      await setRequestStatus(second, 'confirmed', admin.id)
      await setRequestStatus(third, 'cancelled', admin.id, 'гость передумал')
    }

    const note = skipped.length ? ` Пропущено: ${skipped.join('; ')}.` : ''
    return { result: `Создано заявок: ${created.length} (№ ${created.join(', ')}).${note}` }
  },
})
