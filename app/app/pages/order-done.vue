<script setup lang="ts">
// «Заказ принят» (order-done.html прототипа). Сюда SumUp возвращает покупателя после оплаты
// (5.3, 28.11.2026) — сервер заодно спрашивает SumUp, оплачен ли заказ. Четыре состояния:
// оплачен — спасибо и что дальше; не оплачен — «Оплатить» (новая попытка); отменён — не оплачен
// за час, оформить заново; без онлайн-оплаты — пришлём на почту, как оплатить.
// Заказ — по ссылке /order-done?id=<publicId>, номер в адресе не светится.
import type { SiteOrderDone } from '#shared/orders'
import { formatPrice } from '#shared/money'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const publicId = computed(() => String(route.query.id ?? ''))

const { data: order, refresh } = await useFetch<SiteOrderDone>('/api/site/orders/done', {
  query: { id: publicId },
})

/** paid — оплачен (или уже дальше); unpaid — можно оплатить онлайн; manual — оплату пришлём письмом */
const state = computed(() => {
  const o = order.value
  if (!o) return null
  if (o.status === 'cancelled') return 'cancelled'
  if (o.status !== 'awaiting_payment') return 'paid'
  return o.canPay ? 'unpaid' : 'manual'
})
const heroTitle = computed(() =>
  state.value && state.value !== 'manual'
    ? t(`orderDone.${state.value}.title`)
    : t('orderDone.title'),
)
const heroLead = computed(() =>
  state.value && state.value !== 'manual'
    ? t(`orderDone.${state.value}.lead`)
    : t('orderDone.lead'),
)

useHead({ title: () => `${heroTitle.value} — Tavern Peetri Toll` })

const paying = ref(false)
const payError = ref('')

async function pay() {
  payError.value = ''
  paying.value = true
  try {
    const res = await $fetch<{ paid: boolean; payUrl: string | null }>('/api/site/orders/pay', {
      method: 'POST',
      body: { id: publicId.value },
    })
    if (res.payUrl) {
      await navigateTo(res.payUrl, { external: true })
      return // кнопка остаётся «Открываем оплату…», пока грузится страница SumUp
    }
    await refresh() // уже оплачен — покажем спасибо
  } catch (e) {
    await refresh() // мог отмениться по сроку — покажем это
    payError.value = apiErrorMessage(e, t('orderDone.unpaid.failed'))
  }
  paying.value = false
}
</script>

<template>
  <div>
    <section class="page-hero page-hero--short">
      <img class="hero__bg" src="/images/weapons-1.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/shop')">{{ t('nav.shop') }}</NuxtLink> /
          {{ t('orderDone.crumb') }}
        </p>
        <h1 class="page-hero__title">{{ heroTitle }}</h1>
        <p class="page-hero__lead">{{ heroLead }}</p>
      </div>
    </section>

    <section class="section section--shop">
      <div class="container">
        <div class="bq-done order-done">
          <template v-if="order && state === 'paid'">
            <p class="quote">{{ t('orderDone.paid.number', { n: order.id }) }}</p>
            <h2 class="intro__title">
              {{ t('orderDone.sum') }} — {{ formatPrice(order.totalCents) }}
            </h2>
            <p>
              {{ t('orderDone.paid.mail') }} <b>{{ order.email }}</b
              >.
            </p>
            <p v-if="order.delivery !== 'none'">
              {{ t(`orderDone.paid.next.${order.delivery}`) }}
            </p>
            <p v-if="order.hasDigital">{{ t('orderDone.paid.next.digital') }}</p>
          </template>

          <template v-else-if="order && state === 'unpaid'">
            <p class="quote">{{ t('orderDone.unpaid.number', { n: order.id }) }}</p>
            <h2 class="intro__title">
              {{ t('orderDone.sum') }} — {{ formatPrice(order.totalCents) }}
            </h2>
            <p>{{ t('orderDone.unpaid.text') }}</p>
          </template>

          <template v-else-if="order && state === 'cancelled'">
            <p class="quote">{{ t('orderDone.cancelled.number', { n: order.id }) }}</p>
            <p>{{ t('orderDone.cancelled.text') }}</p>
          </template>

          <template v-else-if="order">
            <p class="quote">{{ t('orderDone.number', { n: order.id }) }}</p>
            <h2 class="intro__title">
              {{ t('orderDone.sum') }} — {{ formatPrice(order.totalCents) }}
            </h2>
            <p>
              {{ t('orderDone.mail') }} <b>{{ order.email }}</b
              >.
            </p>
            <p v-if="order.delivery !== 'none'">{{ t(`orderDone.next.${order.delivery}`) }}</p>
            <p v-if="order.hasDigital">{{ t('orderDone.next.digital') }}</p>
          </template>

          <p v-else>{{ t('orderDone.unknown') }}</p>

          <p v-if="payError" class="form__error" role="alert">{{ payError }}</p>
          <div class="bq-done__actions">
            <button
              v-if="state === 'unpaid'"
              class="btn btn--red"
              type="button"
              :disabled="paying"
              @click="pay"
            >
              {{ paying ? t('orderDone.unpaid.paying') : t('orderDone.unpaid.pay') }}
            </button>
            <NuxtLink class="btn" :to="localePath('/shop')">{{ t('orderDone.toShop') }}</NuxtLink>
            <NuxtLink
              v-if="state !== 'unpaid'"
              class="btn btn--red"
              :to="localePath('/restaurant')"
              >{{ t('orderDone.toRestaurant') }}</NuxtLink
            >
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
