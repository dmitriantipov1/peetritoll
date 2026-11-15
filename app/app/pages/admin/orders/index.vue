<script setup lang="ts">
// Заказы магазина (7.3). Разметка и классы — из прототипа (admin/orders.html).
// Пока SumUp не подключён, новые заказы приходят «ждёт оплаты»: оплату персонал согласует
// с покупателем письмом и отмечает в карточке.
import { formatPrice } from '#shared/money'
import { plural } from '#shared/plural'
import {
  deliveryMethodNames,
  orderStatusNames,
  orderStatuses,
  type AdminOrderRow,
  type DeliveryMethod,
  type OrderStatus,
} from '#shared/orders'

definePageMeta({ layout: 'admin', access: ['orders'] })
defineI18nRoute(false)
useHead({ title: 'Заказы — админка Peetri Toll' })

const { data: list, error } = await useFetch<AdminOrderRow[]>('/api/admin/orders')
const rows = computed(() => list.value ?? [])

// ---------- Фильтры ----------

const status = ref<'all' | OrderStatus>('all')
const delivery = ref<'any' | DeliveryMethod>('any')
const period = ref<'any' | 'month' | 'prev' | 'year'>('any')
const search = ref('')

const tallinnMonth = (iso: string) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Tallinn' }).format(new Date(iso)).slice(0, 7)
const thisMonth = tallinnMonth(new Date().toISOString())
const prevMonth = (() => {
  const [y, m] = thisMonth.split('-').map(Number) as [number, number]
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
})()

function inPeriod(iso: string) {
  const m = tallinnMonth(iso)
  if (period.value === 'month') return m === thisMonth
  if (period.value === 'prev') return m === prevMonth
  if (period.value === 'year') return m.slice(0, 4) === thisMonth.slice(0, 4)
  return true
}

const query = computed(() => search.value.trim().toLowerCase().replace(/^№\s*/, ''))
function matches(o: AdminOrderRow) {
  const q = query.value
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  return (
    String(o.id) === q ||
    o.name.toLowerCase().includes(q) ||
    o.email.includes(q) ||
    (o.trackingNo ?? '').toLowerCase().includes(q) ||
    (digits.length >= 3 && (o.phone ?? '').replace(/\D/g, '').includes(digits))
  )
}

/** Всё, кроме статуса, — от этого считаются цифры на вкладках */
const filtered = computed(() =>
  rows.value.filter(
    (o) =>
      (delivery.value === 'any' || o.delivery === delivery.value) &&
      inPeriod(o.createdAt) &&
      matches(o),
  ),
)
const shown = computed(() =>
  status.value === 'all' ? filtered.value : filtered.value.filter((o) => o.status === status.value),
)
const count = (s: 'all' | OrderStatus) =>
  s === 'all' ? filtered.value.length : filtered.value.filter((o) => o.status === s).length

// ---------- Сводка ----------

const awaiting = computed(() => rows.value.filter((o) => o.status === 'awaiting_payment'))
const paid = computed(() => rows.value.filter((o) => o.status === 'paid'))
const ready = computed(() => rows.value.filter((o) => o.status === 'ready'))
const month = computed(() =>
  rows.value.filter((o) => o.status !== 'cancelled' && tallinnMonth(o.createdAt) === thisMonth),
)
const monthSum = computed(() => month.value.reduce((s, o) => s + o.totalCents, 0))
const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'Europe/Tallinn' })
  .format(new Date())
  .replace(/^./, (c) => c.toUpperCase())

// ---------- Подписи ----------

const now = Date.now()
function received(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Tallinn',
  })
    .format(new Date(iso))
    .replace(/\.(\d\d),?\s/, '.$1, ')
}
function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return Math.round(hours / 24) === 1 ? 'вчера' : ''
}

const shortDelivery: Record<DeliveryMethod, string> = {
  pickup: 'Самовывоз',
  parcel: 'Почтомат',
  eu: 'Почта в ЕС',
  none: 'Цифровой',
}
function deliveryText(o: AdminOrderRow) {
  if (o.delivery === 'none') return shortDelivery.none
  return o.hasDigital ? `${shortDelivery[o.delivery]} + цифровой` : shortDelivery[o.delivery]
}

const statusClass: Record<OrderStatus, string> = {
  awaiting_payment: 'adm-status--new',
  paid: 'adm-status--new',
  packing: 'adm-status--work',
  ready: 'adm-status--work',
  shipped: 'adm-status--work',
  done: 'adm-status--done',
  cancelled: 'adm-status--cancel',
}
const isNew = (o: AdminOrderRow) => o.status === 'awaiting_payment' || o.status === 'paid'
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Работа</p>
        <h1 class="adm-top__title">Заказы</h1>
      </div>
      <div class="adm-top__actions">
        <NuxtLink class="adm-top__site" to="/ru/shop" target="_blank">Магазин на сайте</NuxtLink>
        <label class="adm-search">
          <span class="adm-vh">Поиск по заказам</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Номер, имя, e-mail или трек-номер" />
        </label>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить заказы.') }}
    </p>

    <template v-if="list">
      <section class="adm-stats" aria-label="Сводка">
        <div class="adm-stat">
          <p class="adm-stat__label">Ждут оплаты</p>
          <p class="adm-stat__num" :class="{ 'adm-stat__num--alert': awaiting.length }">
            {{ awaiting.length }}
          </p>
          <p class="adm-stat__note">написать покупателю, как оплатить</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">Оплачены</p>
          <p class="adm-stat__num" :class="{ 'adm-stat__num--alert': paid.length }">
            {{ paid.length }}
          </p>
          <p class="adm-stat__note">ждут сборки</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">К выдаче в Палдиски</p>
          <p class="adm-stat__num">{{ ready.length }}</p>
          <p class="adm-stat__note">самовывоз</p>
        </div>
        <div class="adm-stat">
          <p class="adm-stat__label">{{ monthName }}</p>
          <p class="adm-stat__num">{{ month.length }}</p>
          <p class="adm-stat__note">
            {{
              month.length
                ? `${plural(month.length, ['заказ', 'заказа', 'заказов'])} на ${formatPrice(monthSum)}`
                : 'заказов пока нет'
            }}
          </p>
        </div>
      </section>

      <div class="adm-filters">
        <ul class="chips" aria-label="Статус заказа">
          <li>
            <button
              class="chip"
              :class="{ 'is-active': status === 'all' }"
              type="button"
              :aria-pressed="status === 'all'"
              @click="status = 'all'"
            >
              Все<span class="chip__count">{{ count('all') }}</span>
            </button>
          </li>
          <li v-for="s in orderStatuses" :key="s">
            <button
              class="chip"
              :class="{ 'is-active': status === s }"
              type="button"
              :aria-pressed="status === s"
              @click="status = s"
            >
              {{ orderStatusNames[s] }}<span class="chip__count">{{ count(s) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="adm-table-wrap">
        <div class="adm-table-bar">
          <label for="o-deliv">Получение</label>
          <select id="o-deliv" v-model="delivery" class="adm-select">
            <option value="any">Любое</option>
            <option v-for="(name, key) in deliveryMethodNames" :key="key" :value="key">
              {{ shortDelivery[key] }}
            </option>
          </select>
          <label for="o-period">Период</label>
          <select id="o-period" v-model="period" class="adm-select">
            <option value="any">Всё время</option>
            <option value="month">Этот месяц</option>
            <option value="prev">Прошлый месяц</option>
            <option value="year">Этот год</option>
          </select>
          <p class="adm-table-bar__note">
            Онлайн-оплаты пока нет: оплату согласуйте с покупателем и отметьте «Оплачен»
          </p>
        </div>

        <p v-if="!rows.length" class="adm-note" style="padding: 16px">
          Заказов пока нет. Они появятся, когда покупатели оформят их в магазине на сайте.
        </p>
        <p v-else-if="!shown.length" class="adm-note" style="padding: 16px">
          Ничего не нашлось — смените фильтр.
        </p>
        <table v-else class="adm-table">
          <thead>
            <tr>
              <th scope="col" class="is-sorted">Заказ ↓</th>
              <th scope="col">Покупатель</th>
              <th scope="col">Товары</th>
              <th scope="col">Получение</th>
              <th scope="col" class="num">Сумма</th>
              <th scope="col">Статус</th>
              <th scope="col"><span class="adm-vh">Открыть</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in shown" :key="o.id" :class="{ 'adm-row--new': isNew(o) }">
              <td class="nowrap">
                <NuxtLink class="adm-guest" :to="`/admin/orders/${o.id}`">№ {{ o.id }}</NuxtLink>
                <small
                  >{{ received(o.createdAt)
                  }}<template v-if="ago(o.createdAt)"> · {{ ago(o.createdAt) }}</template></small
                >
              </td>
              <td>
                {{ o.name }}<small>{{ o.email }}</small>
              </td>
              <td class="adm-details">{{ o.items }}</td>
              <td>
                {{ deliveryText(o) }}<small v-if="o.trackingNo">{{ o.trackingNo }}</small>
              </td>
              <td class="num">{{ formatPrice(o.totalCents) }}</td>
              <td>
                <span class="adm-status" :class="statusClass[o.status]">
                  {{ orderStatusNames[o.status] }}
                </span>
              </td>
              <td>
                <NuxtLink
                  class="adm-open"
                  :to="`/admin/orders/${o.id}`"
                  :aria-label="`Открыть заказ № ${o.id}: ${o.name}`"
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
