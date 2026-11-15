<script setup lang="ts">
// «Заказ принят» (order-done.html прототипа). Оплаты пока нет — заказ «ждёт оплаты»:
// говорим, что пришлём на почту, как оплатить, и что будет с получением.
// Заказ — по ссылке /order-done?id=<publicId>, номер в адресе не светится.
import type { SiteOrderDone } from '#shared/orders'
import { formatPrice } from '#shared/money'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const { data: order } = await useFetch<SiteOrderDone>('/api/site/orders/done', {
  query: { id: computed(() => String(route.query.id ?? '')) },
})
useHead({ title: () => `${t('orderDone.title')} — Tavern Peetri Toll` })
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
        <h1 class="page-hero__title">{{ t('orderDone.title') }}</h1>
        <p class="page-hero__lead">{{ t('orderDone.lead') }}</p>
      </div>
    </section>

    <section class="section section--shop">
      <div class="container">
        <div class="bq-done order-done">
          <template v-if="order">
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
          <div class="bq-done__actions">
            <NuxtLink class="btn" :to="localePath('/shop')">{{ t('orderDone.toShop') }}</NuxtLink>
            <NuxtLink class="btn btn--red" :to="localePath('/restaurant')">{{
              t('orderDone.toRestaurant')
            }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
