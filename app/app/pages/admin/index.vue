<script setup lang="ts">
// Заявки — главная админки (7.1, 7.2). Разметка и классы — из прототипа (admin/index.html).
// Сотрудник видит только виды заявок, к которым у него есть доступ: сервер отдаёт только их.
import { requestSections } from '~/utils/admin-nav'
import { addDays, fullDate, mondayOf, shortDate, todayInTallinn, weekday } from '#shared/dates'
import { formatPrice } from '#shared/money'
import { plural } from '#shared/plural'
import {
  inTab,
  requestSection,
  requestStatusNames,
  requestStatuses,
  requestTabs,
  requestTypeNames,
  type AdminRequestRow,
  type RequestStatus,
  type RequestTabKey,
} from '#shared/requests'

definePageMeta({ layout: 'admin', access: requestSections })
// Админка — без языкового префикса (5.1). Нужно в каждой странице admin/.
defineI18nRoute(false)
useHead({ title: 'Заявки — админка Peetri Toll' })

const { can } = useAdminUser()
const { data: list, error } = await useFetch<AdminRequestRow[]>('/api/admin/requests')
const rows = computed(() => list.value ?? [])

// ---------- Фильтры ----------

const tab = ref<'all' | RequestTabKey>('all')
const status = ref<'all' | RequestStatus>('all')
const period = ref<'any' | 'today' | 'week' | 'month'>('any')
const search = ref('')

/** Вкладки только тех видов, к которым есть доступ */
const tabs = computed(() => requestTabs.filter((t) => can(requestSection[t.type])))

const today = todayInTallinn()
function inPeriod(date: string | null): boolean {
  if (period.value === 'any') return true
  if (!date) return false
  if (period.value === 'today') return date === today
  if (period.value === 'week') {
    const monday = mondayOf(today)
    return date >= monday && date <= addDays(monday, 6)
  }
  return date.slice(0, 7) === today.slice(0, 7)
}

const query = computed(() => search.value.trim().toLowerCase().replace(/^№\s*/, ''))
function matches(r: AdminRequestRow): boolean {
  const q = query.value
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  return (
    r.name.toLowerCase().includes(q) ||
    (r.email ?? '').includes(q) ||
    String(r.id) === q ||
    (digits.length >= 3 && r.phone.replace(/\D/g, '').includes(digits))
  )
}

/** Всё, кроме вкладки, — от этого считаются цифры на вкладках */
const filtered = computed(() =>
  rows.value.filter(
    (r) =>
      (status.value === 'all' || r.status === status.value) && inPeriod(r.visitDate) && matches(r),
  ),
)
const shown = computed(() =>
  tab.value === 'all'
    ? filtered.value
    : filtered.value.filter((r) => inTab(r, tab.value as RequestTabKey)),
)
const count = (key: 'all' | RequestTabKey) =>
  key === 'all' ? filtered.value.length : filtered.value.filter((r) => inTab(r, key)).length

// ---------- Сводка ----------

const now = Date.now()
const active = computed(() => rows.value.filter((r) => r.status !== 'cancelled'))
const fresh = computed(() => rows.value.filter((r) => r.status === 'new'))
const oldestNew = computed(() => {
  const oldest = fresh.value.at(-1)
  return oldest ? ago(oldest.createdAt, true) : ''
})
const inWork = computed(() => rows.value.filter((r) => r.status === 'in_progress').length)
const todayVisits = computed(() => active.value.filter((r) => r.visitDate === today))
const todayNote = computed(() => {
  const byType = new Map<string, number>()
  for (const r of todayVisits.value) {
    const name = requestTypeNames[r.type].toLowerCase()
    byType.set(name, (byType.get(name) ?? 0) + 1)
  }
  return [...byType].map(([name, n]) => `${name} — ${n}`).join(', ')
})
// «Банкеты в ноябре» — месяц в предложном падеже
const monthsIn = [
  'январе',
  'феврале',
  'марте',
  'апреле',
  'мае',
  'июне',
  'июле',
  'августе',
  'сентябре',
  'октябре',
  'ноябре',
  'декабре',
]
const monthIn = monthsIn[Number(today.slice(5, 7)) - 1]
const banquetsThisMonth = computed(() =>
  active.value.filter(
    (r) => r.type === 'banquet' && r.visitDate?.slice(0, 7) === today.slice(0, 7),
  ),
)
const banquetsSum = computed(() =>
  banquetsThisMonth.value.reduce((sum, r) => sum + (r.totalCents ?? 0), 0),
)
const todayLabel = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Tallinn',
}).format(new Date(`${today}T12:00:00Z`))

// ---------- Подписи ----------

const weekdays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** «31.10, 11:20» по Таллину */
function received(iso: string): string {
  const local = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Tallinn',
  }).format(new Date(iso))
  return local.replace(/\.(\d\d),?\s/, '.$1, ')
}

/** «1 ч назад», «вчера»; long — «16 ч», «2 дня» для сводки */
function ago(iso: string, long = false): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return long ? `${minutes} мин` : `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return long ? `${hours} ч` : `${hours} ч назад`
  const days = Math.round(hours / 24)
  if (long) return `${days} ${plural(days, ['день', 'дня', 'дней'])}`
  return days === 1 ? 'вчера' : ''
}

function visit(r: AdminRequestRow): string {
  if (!r.visitDate) return '—'
  const year = r.visitDate.slice(0, 4) === today.slice(0, 4)
  return `${weekdays[weekday(r.visitDate) - 1]}, ${year ? shortDate(r.visitDate) : fullDate(r.visitDate)}`
}

const statusClass: Record<RequestStatus, string> = {
  new: 'adm-status--new',
  in_progress: 'adm-status--work',
  confirmed: 'adm-status--done',
  cancelled: 'adm-status--cancel',
}

/** Под именем — телефон, а если его не видно — почта */
const contact = (r: AdminRequestRow) => r.phone || r.email || ''
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Работа</p>
        <h1 class="adm-top__title">Заявки</h1>
      </div>
      <div class="adm-top__actions">
        <NuxtLink class="adm-top__site" to="/" target="_blank">Открыть сайт</NuxtLink>
        <label class="adm-search">
          <span class="adm-vh">Поиск по заявкам</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Имя, телефон, e-mail или №" />
        </label>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить заявки.') }}
    </p>

    <template v-if="list">
      <section class="adm-stats" aria-label="Сводка">
        <div class="adm-stat">
          <p class="adm-stat__label">Новые</p>
          <p class="adm-stat__num" :class="{ 'adm-stat__num--alert': fresh.length }">
            {{ fresh.length }}
          </p>
          <p class="adm-stat__note">
            {{ fresh.length ? `ждут ответа, самая старая — ${oldestNew}` : 'все разобраны' }}
          </p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">В работе</p>
          <p class="adm-stat__num">{{ inWork }}</p>
          <p class="adm-stat__note">согласуем с гостем</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">Сегодня, {{ todayLabel }}</p>
          <p class="adm-stat__num">{{ todayVisits.length }}</p>
          <p class="adm-stat__note">{{ todayNote || 'визитов по заявкам нет' }}</p>
        </div>
        <div v-if="can('requests.banquet')" class="adm-stat">
          <p class="adm-stat__label">Банкеты в {{ monthIn }}</p>
          <p class="adm-stat__num">{{ banquetsThisMonth.length }}</p>
          <p class="adm-stat__note">
            {{ banquetsSum ? `ориентировочно ${formatPrice(banquetsSum)}` : 'расчёта нет' }}
          </p>
        </div>
      </section>

      <div class="adm-filters">
        <ul class="chips" aria-label="Вид заявки">
          <li>
            <button
              class="chip"
              :class="{ 'is-active': tab === 'all' }"
              type="button"
              :aria-pressed="tab === 'all'"
              @click="tab = 'all'"
            >
              Все<span class="chip__count">{{ count('all') }}</span>
            </button>
          </li>
          <li v-for="t in tabs" :key="t.key">
            <button
              class="chip"
              :class="{ 'is-active': tab === t.key }"
              type="button"
              :aria-pressed="tab === t.key"
              @click="tab = t.key"
            >
              {{ t.label }}<span class="chip__count">{{ count(t.key) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="adm-table-wrap">
        <div class="adm-table-bar">
          <label for="f-status">Статус</label>
          <select id="f-status" v-model="status" class="adm-select">
            <option value="all">Все</option>
            <option v-for="s in requestStatuses" :key="s" :value="s">
              {{ requestStatusNames[s] }}
            </option>
          </select>
          <label for="f-period">Визит</label>
          <select id="f-period" v-model="period" class="adm-select">
            <option value="any">Любая дата</option>
            <option value="today">Сегодня</option>
            <option value="week">Эта неделя</option>
            <option value="month">Этот месяц</option>
          </select>
          <p class="adm-table-bar__note">
            {{ shown.length }} {{ plural(shown.length, ['заявка', 'заявки', 'заявок']) }} · сначала
            новые
          </p>
        </div>

        <p v-if="!rows.length" class="adm-note" style="padding: 16px">
          Заявок пока нет. Они появятся, когда заработают формы на сайте.
        </p>
        <p v-else-if="!shown.length" class="adm-note" style="padding: 16px">
          Ничего не нашлось — смените фильтр.
        </p>
        <table v-else class="adm-table">
          <thead>
            <tr>
              <th scope="col" class="is-sorted">Поступила ↓</th>
              <th scope="col">Тип</th>
              <th scope="col">Гость</th>
              <th scope="col">Визит</th>
              <th scope="col" class="num">Гостей</th>
              <th scope="col">Подробности</th>
              <th scope="col">Статус</th>
              <th scope="col"><span class="adm-vh">Открыть</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in shown" :key="r.id" :class="{ 'adm-row--new': r.status === 'new' }">
              <td class="nowrap">
                {{ received(r.createdAt) }}<small>{{ ago(r.createdAt) || `№ ${r.id}` }}</small>
              </td>
              <td class="adm-type">{{ requestTypeNames[r.type] }}</td>
              <td>
                <NuxtLink class="adm-guest" :to="`/admin/requests/${r.id}`">{{ r.name }}</NuxtLink>
                <small>{{ contact(r) }}</small>
              </td>
              <td class="nowrap">
                {{ visit(r) }}<small v-if="r.visitTime">{{ r.visitTime }}</small>
              </td>
              <td class="num">{{ r.guests ?? '—' }}</td>
              <td class="adm-details">{{ r.summary }}</td>
              <td>
                <span class="adm-status" :class="statusClass[r.status]">
                  {{ requestStatusNames[r.status] }}
                </span>
              </td>
              <td>
                <NuxtLink
                  class="adm-open"
                  :to="`/admin/requests/${r.id}`"
                  :aria-label="`Открыть заявку № ${r.id}: ${r.name}`"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
