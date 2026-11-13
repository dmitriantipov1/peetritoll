<script setup lang="ts">
// «Дневная трапеза» — меню дня из базы (lunch.html прототипа, вариант 3 «таблица на неделю»).
// Ссылок с сайта нет — только прямая ссылка (решение заказчицы 11.11.2026).
// «День / Наименование / Цена»: суп и под ним горячее, у каждого своя цена; сегодня подсвечено.
// Ниже — предзаказ (components/LunchPreorder.vue), если он включён в настройках меню дня.
import type { SiteLunch, SiteLunchDay } from '#shared/site-lunch'
import { formatPrice } from '#shared/money'

const { t, locale } = useI18n()

useHead({ title: () => `${t('lunch.title')} — Tavern Peetri Toll` })

const { data: lunch, error } = await useFetch<SiteLunch>('/api/site/lunch', { query: { locale } })
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

// Даты без часового пояса браузера: «2026-11-09» — это день по Таллину
const asDate = (d: string) => new Date(`${d}T00:00:00Z`)
const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' })

const dayName = (d: string) => {
  const name = fmt({ weekday: 'long' }).format(asDate(d))
  return name.charAt(0).toUpperCase() + name.slice(1)
}
const dayDate = (d: string) => fmt({ day: 'numeric', month: 'long' }).format(asDate(d))
const weekCaption = computed(() => {
  if (!lunch.value) return ''
  const days = lunch.value.days
  return t('lunch.week', {
    range: fmt({ day: 'numeric', month: 'long' }).formatRange(
      asDate(days[0]!.date),
      asDate(days[days.length - 1]!.date),
    ),
  })
})

const hours = computed(() =>
  lunch.value ? `${lunch.value.servedFrom} — ${lunch.value.servedTo}` : '',
)

/** Строки дня: суп и горячее; пустой день — одна строка «меню нет» */
const rows = (d: SiteLunchDay) =>
  [
    d.soup && { kind: t('lunch.soup'), ...d.soup },
    d.main && { kind: t('lunch.main'), ...d.main },
  ].filter((x): x is { kind: string; name: string; priceCents: number } => !!x)

const emptyWeek = computed(() => lunch.value?.days.every((d) => !d.soup && !d.main) ?? true)
</script>

<template>
  <div v-if="lunch">
    <PageHero
      :title="t('lunch.title')"
      image="/images/restaurant-hall.jpg"
      :crumb="t('lunch.crumb')"
      :lead="
        t(lunch.acceptPreorders ? 'lunch.heroLeadOrder' : 'lunch.heroLead', {
          from: lunch.servedFrom,
          to: lunch.servedTo,
        })
      "
    />

    <section id="menyu-dnya" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="t('lunch.sectionCrumb', { hours })"
          :title="t('lunch.sectionTitle')"
          :more="
            lunch.acceptPreorders ? { to: '#predzakaz', label: t('lunch.orderAhead') } : undefined
          "
        />

        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('lunch.lead') }}</h3>
          <p>{{ t('lunch.text') }}</p>
        </div>

        <p v-if="emptyWeek" class="events-empty">{{ t('lunch.emptyWeek') }}</p>

        <table v-else class="lunch-week lunch-week--split">
          <caption class="lunch-week__caption">
            {{
              weekCaption
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ t('lunch.colDay') }}</th>
              <th scope="col">{{ t('lunch.colName') }}</th>
              <th scope="col">{{ t('lunch.colPrice') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="d in lunch.days" :key="d.date">
              <template v-if="rows(d).length">
                <tr
                  v-for="(r, i) in rows(d)"
                  :key="r.kind"
                  :class="{ 'is-today': d.date === lunch.today, 'lunch-week__second': i > 0 }"
                >
                  <th v-if="i === 0" scope="row" :rowspan="rows(d).length">
                    {{ dayName(d.date) }}<span class="lunch-week__date">{{ dayDate(d.date) }}</span>
                    <span v-if="d.date === lunch.today" class="lunch-week__today">{{
                      t('lunch.today')
                    }}</span>
                  </th>
                  <td>
                    <span class="lunch-week__kind">{{ r.kind }}</span
                    >{{ r.name }}
                  </td>
                  <td class="lunch-week__cost">{{ formatPrice(r.priceCents) }}</td>
                </tr>
              </template>
              <tr v-else :class="{ 'is-today': d.date === lunch.today }">
                <th scope="row">
                  {{ dayName(d.date) }}<span class="lunch-week__date">{{ dayDate(d.date) }}</span>
                </th>
                <td colspan="2" class="lunch-week__none">{{ t('lunch.noMenu') }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <LunchPreorder v-if="lunch.acceptPreorders" :lunch="lunch" />
  </div>
</template>
