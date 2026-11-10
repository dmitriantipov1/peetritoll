<script setup lang="ts">
// Лиды (8.2): все, кто оставлял заявки, — один человек, один контакт.
// Разметка и классы — из прототипа (admin/leads.html). Экспорт CSV и Mautic — этап 5.
import { todayInTallinn } from '#shared/dates'
import { plural } from '#shared/plural'
import {
  leadCategories,
  leadCategoryNames,
  leadMarketingNames,
  type AdminLeadRow,
  type LeadCategory,
  type LeadMarketing,
  type LeadTagCount,
} from '#shared/leads'

definePageMeta({ layout: 'admin', access: ['leads'] })
defineI18nRoute(false)
useHead({ title: 'Лиды — админка Peetri Toll' })

const [{ data: list, error }, { data: tags }] = await Promise.all([
  useFetch<AdminLeadRow[]>('/api/admin/leads'),
  useFetch<LeadTagCount[]>('/api/admin/leads/tags'),
])
const rows = computed(() => list.value ?? [])

// ---------- Фильтры ----------

const category = ref<'all' | LeadCategory>('all')
const tag = ref('')
const marketing = ref<'all' | LeadMarketing>('all')
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  return rows.value.filter(
    (r) =>
      (!tag.value || r.tags.some((t) => t.tag === tag.value)) &&
      (marketing.value === 'all' || r.marketing === marketing.value) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        (r.email ?? '').includes(q) ||
        (digits.length >= 3 && (r.phone ?? '').replace(/\D/g, '').includes(digits))),
  )
})
const shown = computed(() =>
  category.value === 'all'
    ? filtered.value
    : filtered.value.filter((r) => r.categories.includes(category.value as LeadCategory)),
)
const count = (c: 'all' | LeadCategory) =>
  c === 'all'
    ? filtered.value.length
    : filtered.value.filter((r) => r.categories.includes(c)).length

// ---------- Сводка ----------

const today = todayInTallinn()
const months = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]
const monthName = months[Number(today.slice(5, 7)) - 1]
const agreed = computed(() => rows.value.filter((r) => r.marketing === 'yes').length)
const newThisMonth = computed(
  () =>
    rows.value.filter(
      (r) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tallinn' })
          .format(new Date(r.createdAt))
          .slice(0, 7) === today.slice(0, 7),
    ).length,
)
const dupes = computed(() => rows.value.filter((r) => r.possibleDupe).length)

const date = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Tallinn' }).format(new Date(iso))
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Tallinn',
  }).format(new Date(iso))
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Люди</p>
        <h1 class="adm-top__title">Лиды</h1>
      </div>
      <div class="adm-top__actions">
        <label class="adm-search">
          <span class="adm-vh">Поиск по лидам</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Имя, e-mail или телефон" />
        </label>
        <button class="btn btn--sm" type="button" disabled title="Этап 5">
          Экспорт CSV · этап 5
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить лиды.') }}
    </p>

    <template v-if="list">
      <section class="adm-stats" aria-label="Сводка">
        <div class="adm-stat">
          <p class="adm-stat__label">Контактов</p>
          <p class="adm-stat__num">{{ rows.length }}</p>
          <p class="adm-stat__note">один человек — один контакт</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">Согласны на рассылку</p>
          <p class="adm-stat__num">{{ agreed }}</p>
          <p class="adm-stat__note">только они уедут в Mautic</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">Новых за {{ monthName }}</p>
          <p class="adm-stat__num">{{ newThisMonth }}</p>
          <p class="adm-stat__note">из заявок</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">Возможные дубли</p>
          <p class="adm-stat__num" :class="{ 'adm-stat__num--alert': dupes }">{{ dupes }}</p>
          <p class="adm-stat__note">один телефон, разные почты</p>
        </div>
      </section>

      <div class="adm-filters">
        <ul class="chips" aria-label="Категория">
          <li v-for="c in ['all', ...leadCategories] as const" :key="c">
            <button
              class="chip"
              :class="{ 'is-active': category === c }"
              type="button"
              :aria-pressed="category === c"
              @click="category = c"
            >
              {{ c === 'all' ? 'Все' : leadCategoryNames[c]
              }}<span class="chip__count">{{ count(c) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="adm-table-wrap">
        <div class="adm-table-bar">
          <label for="l-tag">Тег</label>
          <select id="l-tag" v-model="tag" class="adm-select">
            <option value="">Любой</option>
            <option v-for="t in tags ?? []" :key="t.tag" :value="t.tag">
              {{ t.tag }} ({{ t.count }})
            </option>
          </select>
          <label for="l-flag">Рассылка</label>
          <select id="l-flag" v-model="marketing" class="adm-select">
            <option value="all">Все</option>
            <option value="yes">Согласны</option>
            <option value="pending">Ждут подтверждения</option>
            <option value="no">Не согласны</option>
          </select>
          <p class="adm-table-bar__note">Пунктирные теги ставит сайт сам, по источнику</p>
        </div>

        <p v-if="!rows.length" class="adm-note" style="padding: 16px">
          Контактов пока нет. Они появятся из заявок с сайта.
        </p>
        <p v-else-if="!shown.length" class="adm-note" style="padding: 16px">
          Ничего не нашлось — смените фильтр.
        </p>
        <table v-else class="adm-table">
          <thead>
            <tr>
              <th scope="col">Контакт</th>
              <th scope="col">Теги</th>
              <th scope="col">Язык</th>
              <th scope="col">Рассылка</th>
              <th scope="col" class="num">Событий</th>
              <th scope="col" class="is-sorted">Последнее ↓</th>
              <th scope="col"><span class="adm-vh">Открыть</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in shown" :key="r.id">
              <td>
                <NuxtLink class="adm-guest" :to="`/admin/leads/${r.id}`">{{ r.name }}</NuxtLink>
                <small>{{ [r.email, r.phone].filter(Boolean).join(' · ') }}</small>
                <small v-if="r.possibleDupe" class="adm-danger">возможный дубль</small>
              </td>
              <td class="adm-tags-cell">
                <span
                  v-for="t in r.tags"
                  :key="t.tag"
                  class="adm-tag"
                  :class="t.auto ? 'adm-tag--auto' : 'adm-tag--hand'"
                  >{{ t.tag }}</span
                >
              </td>
              <td>{{ r.locale.toUpperCase() }}</td>
              <td class="nowrap">
                {{ leadMarketingNames[r.marketing] }}
                <template v-if="r.marketing === 'yes' && r.marketingAt">
                  · {{ shortDate(r.marketingAt) }}</template
                >
              </td>
              <td class="num">{{ r.events }}</td>
              <td class="nowrap">{{ date(r.lastEventAt) }}</td>
              <td>
                <NuxtLink
                  class="adm-open"
                  :to="`/admin/leads/${r.id}`"
                  :aria-label="`Открыть контакт: ${r.name}`"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="shown.length" class="adm-note" style="padding: 10px 16px">
          {{ shown.length }} {{ plural(shown.length, ['контакт', 'контакта', 'контактов']) }}
        </p>
      </div>
    </template>
  </div>
</template>
