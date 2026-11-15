<script setup lang="ts">
// Карточка заказа (7.3): состав, получение, покупатель, история, статус. Разметка и классы —
// из прототипа (admin/order.html). Онлайн-оплаты пока нет: «Оплачен» отмечают руками,
// когда покупатель заплатил по счёту. Отмена возвращает остаток товаров, обратно не переводится.
// Без права «правит» — только просмотр.
import { fullDate, momentLabel } from '#shared/dates'
import { formatPrice } from '#shared/money'
import { plural } from '#shared/plural'
import {
  deliveryMethodNames,
  orderStatusChoices,
  orderStatusNames,
  orderStatuses,
  type AdminOrder,
  type OrderSave,
  type OrderStatus,
} from '#shared/orders'

definePageMeta({ layout: 'admin', access: ['orders'] })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()
const { data: order, error } = await useFetch<AdminOrder>(
  () => `/api/admin/orders/${route.params.id}`,
)
useHead({ title: () => `Заказ № ${order.value?.id ?? ''} — админка Peetri Toll` })

const canEdit = computed(() => can('orders', 'edit'))

function initialState() {
  const o = order.value
  return {
    status: (o?.status ?? 'awaiting_payment') as OrderStatus,
    trackingNo: o?.trackingNo ?? '',
    staffNote: o?.staffNote ?? '',
    note: '',
  }
}
const form = reactive(initialState())
watch(order, () => Object.assign(form, initialState()))

const choices = computed(() => (order.value ? orderStatusChoices(order.value.status) : []))
const cancelling = computed(
  () => order.value?.status !== 'cancelled' && form.status === 'cancelled',
)
const restock = computed(() =>
  (order.value?.orderItems ?? []).filter((i) => i.kind === 'physical' && i.productId),
)

const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

async function save() {
  const o = order.value
  if (!o) return
  saveError.value = ''
  saving.value = true
  const body: OrderSave = {
    status: form.status,
    trackingNo: form.trackingNo,
    staffNote: form.staffNote,
    note: form.note,
  }
  try {
    order.value = await $fetch<AdminOrder>(`/api/admin/orders/${o.id}`, { method: 'PUT', body })
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

// ---------- Подписи ----------

const localeNames = { et: 'эстонская', en: 'английская', ru: 'русская' } as const

const statusClass: Record<OrderStatus, string> = {
  awaiting_payment: 'adm-status--new',
  paid: 'adm-status--new',
  packing: 'adm-status--work',
  ready: 'adm-status--work',
  shipped: 'adm-status--work',
  done: 'adm-status--done',
  cancelled: 'adm-status--cancel',
}
const segClass: Record<OrderStatus, string> = {
  awaiting_payment: 'is-new',
  paid: 'is-new',
  packing: 'is-work',
  ready: 'is-work',
  shipped: 'is-work',
  done: 'is-done',
  cancelled: 'is-cancel',
}

const meta = computed(() => {
  const o = order.value
  if (!o) return ''
  return [
    o.name,
    momentLabel(new Date(o.createdAt)),
    `${localeNames[o.locale]} версия сайта`,
    o.paidAt ? `оплачено ${formatPrice(o.totalCents)}` : `к оплате ${formatPrice(o.totalCents)}`,
  ].join(' · ')
})

const kindHint = computed(() => {
  const o = order.value
  if (!o) return ''
  if (o.hasDigital && o.hasPhysical) return 'Смешанный: печатное и цифровое'
  return o.hasDigital ? 'Только цифровое' : ''
})

function receiveText(i: AdminOrder['orderItems'][number]) {
  if (i.kind === 'digital') return 'Ссылка на почту'
  if (i.pickupOnly) return 'Только самовывоз'
  return order.value ? deliveryMethodNames[order.value.delivery] : ''
}

const countryNames = new Intl.DisplayNames('ru', { type: 'region' })
const shipFacts = computed(() => {
  const o = order.value
  if (!o) return []
  const s = o.shipTo
  const facts: [string, string][] = [['Способ', deliveryMethodNames[o.delivery]]]
  if (s?.method === 'parcel') facts.push(['Почтомат', `${s.carrier} — ${s.point}`])
  if (s?.method === 'eu') {
    facts.push(['Страна', countryNames.of(s.country) ?? s.country])
    facts.push(['Адрес', `${s.address}, ${s.postcode}`])
  }
  facts.push(['Получатель', [o.name, o.phone].filter(Boolean).join(', ')])
  return facts
})
const shipping = computed(
  () => order.value?.delivery === 'parcel' || order.value?.delivery === 'eu',
)

function historyText(h: AdminOrder['history'][number]) {
  if (h.kind === 'created') return 'Заказ с сайта'
  if (h.kind === 'status') return `Статус: ${h.note ?? ''}`
  return h.note ?? 'Уведомление'
}
</script>

<template>
  <div>
    <NuxtLink v-if="error" class="adm-back" to="/admin/orders">← Все заказы</NuxtLink>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить заказ.') }}
    </p>

    <form v-if="order" @submit.prevent="save">
      <header class="adm-top">
        <div>
          <NuxtLink class="adm-back" to="/admin/orders">← Все заказы</NuxtLink>
          <h1 class="adm-top__title">
            Заказ № {{ order.id }}
            <span class="adm-status" :class="statusClass[order.status]">
              {{ orderStatusNames[order.status] }}
            </span>
          </h1>
          <p class="adm-top__meta">{{ meta }}</p>
        </div>
        <div class="adm-top__actions">
          <a class="btn btn--sm" :href="`mailto:${order.email}?subject=Заказ № ${order.id}`"
            >Написать покупателю</a
          >
        </div>
      </header>

      <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
      <p v-if="saveError" class="adm-alert" role="alert">{{ saveError }}</p>

      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-items">
            <div class="adm-panel__head">
              <h2 id="p-items" class="adm-panel__title">Состав заказа</h2>
              <p v-if="kindHint" class="adm-panel__hint">{{ kindHint }}</p>
            </div>
            <table class="adm-calc">
              <thead>
                <tr>
                  <th scope="col">Товар</th>
                  <th scope="col">Получение</th>
                  <th scope="col" class="num">Кол-во</th>
                  <th scope="col" class="num">Цена</th>
                  <th scope="col" class="num">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in order.orderItems" :key="i.id">
                  <td>
                    <NuxtLink
                      v-if="i.productId && can('products')"
                      class="adm-dish__name"
                      :to="`/admin/products/${i.productId}`"
                      >{{ i.name }}</NuxtLink
                    >
                    <template v-else>{{ i.name }}</template>
                    <small v-if="i.label">{{ i.label }}</small>
                  </td>
                  <td>{{ receiveText(i) }}</td>
                  <td class="num">{{ i.qty }}</td>
                  <td class="num">{{ formatPrice(i.priceCents) }}</td>
                  <td class="num">{{ formatPrice(i.priceCents * i.qty) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">Товары</td>
                  <td class="num">{{ formatPrice(order.goodsCents) }}</td>
                </tr>
                <tr>
                  <td colspan="4">Доставка</td>
                  <td class="num">
                    {{
                      order.delivery === 'none'
                        ? 'не нужна'
                        : order.deliveryCents
                          ? formatPrice(order.deliveryCents)
                          : 'бесплатно'
                    }}
                  </td>
                </tr>
                <tr>
                  <td colspan="4" class="adm-calc__label">
                    {{ order.paidAt ? 'Оплачено' : 'К оплате' }}
                  </td>
                  <td class="num">
                    <span class="adm-calc__total">{{ formatPrice(order.totalCents) }}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <p class="adm-note" style="margin-top: 10px">Названия и цены — как в момент заказа.</p>
          </section>

          <section v-if="order.delivery !== 'none'" class="adm-panel" aria-labelledby="p-ship">
            <div class="adm-panel__head">
              <h2 id="p-ship" class="adm-panel__title">Получение</h2>
              <p v-if="order.hasDigital" class="adm-panel__hint">
                Доставка — только на физическую часть
              </p>
            </div>
            <dl class="adm-facts" style="margin-bottom: 16px">
              <div v-for="[label, text] in shipFacts" :key="label">
                <dt>{{ label }}</dt>
                <dd>{{ text }}</dd>
              </div>
            </dl>
            <fieldset v-if="shipping" class="form adm-fieldset" :disabled="!canEdit">
              <div class="field">
                <label for="d-track">Трек-номер</label>
                <input
                  id="d-track"
                  v-model="form.trackingNo"
                  type="text"
                  maxlength="100"
                  placeholder="CC 0000 0000 EE"
                />
              </div>
            </fieldset>
            <p v-if="shipping" class="adm-note" style="margin-top: 8px">
              Письма покупателю пока нет — трек-номер отправьте ему сами.
            </p>
          </section>

          <section v-if="order.hasDigital" class="adm-panel" aria-labelledby="p-digital">
            <div class="adm-panel__head">
              <h2 id="p-digital" class="adm-panel__title">Цифровая часть</h2>
            </div>
            <p class="adm-note">
              Ссылки на скачивание появятся вместе с онлайн-оплатой. Пока файлы отправьте покупателю
              сами после оплаты.
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-buyer">
            <div class="adm-panel__head">
              <h2 id="p-buyer" class="adm-panel__title">Покупатель</h2>
            </div>
            <dl class="adm-facts" style="margin-bottom: 16px">
              <div>
                <dt>Имя</dt>
                <dd>{{ order.name }}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>
                  <a :href="`mailto:${order.email}`">{{ order.email }}</a>
                </dd>
              </div>
              <div>
                <dt>Телефон</dt>
                <dd>
                  <a v-if="order.phone" :href="`tel:${order.phone.replace(/[^+\d]/g, '')}`">{{
                    order.phone
                  }}</a>
                  <template v-else>не указан</template>
                </dd>
              </div>
            </dl>
            <fieldset class="form adm-fieldset" :disabled="!canEdit">
              <div class="field form__full">
                <label for="o-comment">Комментарий покупателя</label>
                <textarea id="o-comment" :value="order.comment ?? '—'" readonly />
              </div>
              <div class="field form__full">
                <label for="o-note">
                  Заметка для персонала
                  <span style="font-weight: 400">— покупатель её не видит</span>
                </label>
                <textarea id="o-note" v-model="form.staffNote" maxlength="4000" />
              </div>
            </fieldset>
          </section>

          <section class="adm-panel" aria-labelledby="p-history">
            <div class="adm-panel__head">
              <h2 id="p-history" class="adm-panel__title">История</h2>
              <p class="adm-panel__hint">Сначала новые</p>
            </div>
            <ol class="adm-history">
              <li
                v-for="h in order.history"
                :key="h.id"
                :class="{ 'is-key': h.kind !== 'notified' }"
              >
                <time :datetime="h.at">{{ momentLabel(new Date(h.at)) }}</time>
                <p>
                  {{ historyText(h) }}
                  <small v-if="h.userName">{{ h.userName }}</small>
                  <small v-else-if="h.kind === 'created'"
                    >{{ localeNames[order.locale] }} версия, магазин</small
                  >
                </p>
              </li>
            </ol>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Статус и сведения">
          <section class="adm-panel" aria-labelledby="p-status">
            <h2 id="p-status" class="adm-panel__title" style="margin-bottom: 14px">Статус</h2>
            <div class="adm-seg" role="group" aria-labelledby="p-status">
              <button
                v-for="s in orderStatuses"
                :key="s"
                :class="segClass[s]"
                type="button"
                :aria-pressed="form.status === s"
                :disabled="!canEdit || !choices.includes(s)"
                @click="form.status = s"
              >
                {{ orderStatusNames[s] }}
              </button>
            </div>
            <p v-if="cancelling" class="adm-note adm-danger" style="margin-top: 10px">
              Отмену не вернуть.
              <template v-if="restock.length"
                >Остаток товаров вернётся в магазин:
                {{ restock.map((i) => `${i.name} — ${i.qty} шт.`).join(', ') }}.</template
              >
            </p>
            <p v-else-if="order.status === 'cancelled'" class="adm-note" style="margin-top: 10px">
              Заказ отменён, остаток вернулся в магазин. Нужен снова — оформите новый.
            </p>
            <div v-if="canEdit" class="field" style="margin-top: 14px">
              <label for="s-note">Пояснение для истории</label>
              <input
                id="s-note"
                v-model="form.note"
                type="text"
                maxlength="300"
                placeholder="например, оплатил по счёту"
              />
            </div>
            <div class="adm-actions">
              <button v-if="canEdit" class="btn btn--solid" type="submit" :disabled="saving">
                {{ saving ? 'Сохраняем…' : 'Сохранить' }}
              </button>
            </div>
            <p v-if="!canEdit" class="adm-note" style="margin-top: 10px">
              У вас доступ только на просмотр.
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-info">
            <h2 id="p-info" class="adm-panel__title" style="margin-bottom: 14px">Сведения</h2>
            <dl class="adm-facts">
              <div v-if="order.lead">
                <dt>Контакт в лидах</dt>
                <dd>
                  <NuxtLink v-if="can('leads')" :to="`/admin/leads/${order.lead.id}`">
                    {{ order.lead.name }}
                  </NuxtLink>
                  <template v-else>{{ order.lead.name }}</template>
                  ·
                  {{
                    order.lead.events > 1
                      ? `${order.lead.events} ${plural(order.lead.events, ['обращение', 'обращения', 'обращений'])} с ${fullDate(order.lead.since.slice(0, 10))}`
                      : 'новый контакт'
                  }}
                  <br />
                  <span v-for="t in order.lead.tags" :key="t" class="adm-tag">{{ t }}</span>
                </dd>
              </div>
              <div>
                <dt>Оплата</dt>
                <dd>
                  {{
                    order.paidAt
                      ? `Отмечена ${momentLabel(new Date(order.paidAt))}`
                      : 'Ещё нет — онлайн-оплата не подключена'
                  }}
                </dd>
              </div>
              <div>
                <dt>Рассылка</dt>
                <dd>
                  {{
                    order.marketingOptIn
                      ? `Согласие дано в заказе, ${momentLabel(new Date(order.createdAt))}`
                      : 'Не подписан(а)'
                  }}
                </dd>
              </div>
              <div>
                <dt>Согласие с условиями и политикой</dt>
                <dd>
                  {{ momentLabel(new Date(order.consentAt)) }} · политика конфиденциальности, версия
                  {{ order.policyVersion }}
                </dd>
              </div>
              <div>
                <dt>Номер</dt>
                <dd>№ {{ order.id }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </form>
  </div>
</template>
