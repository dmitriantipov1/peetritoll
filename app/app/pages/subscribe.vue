<script setup lang="ts">
// Подтверждение подписки — сюда ведёт ссылка из письма: /ru/subscribe?token=…
// Подписка включается только по нажатию кнопки (POST), не открытием ссылки:
// почтовые сканеры открывают ссылки сами.
import type { SubscribeConfirmResult } from '#shared/subscriptions'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()

useHead({
  title: () => `${t('subscribe.title')} — Tavern Peetri Toll`,
  // Личная ссылка — не для поисковиков
  meta: [{ name: 'robots', content: 'noindex' }],
})

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const sending = ref(false)
const result = ref<SubscribeConfirmResult | null>(token.value ? null : 'unknown')
const error = ref('')

async function confirm() {
  error.value = ''
  sending.value = true
  try {
    const res = await $fetch<{ result: SubscribeConfirmResult }>('/api/site/subscribe/confirm', {
      method: 'POST',
      body: { token: token.value },
    })
    result.value = res.result
  } catch (e) {
    // Повреждённая ссылка — та же «не нашли»; остальное — сбой, можно нажать ещё раз
    if ((e as { statusCode?: number }).statusCode === 400) result.value = 'unknown'
    else error.value = t('subscribe.failed')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <PageHero
      :title="t('subscribe.title')"
      image="/images/restaurant-house.jpg"
      :crumb="t('subscribe.title')"
    />
    <section class="section section--bg1">
      <div class="container">
        <div class="bq-done subscribe-box">
          <template v-if="result === null">
            <p class="quote">{{ t('subscribe.lead') }}</p>
            <p>{{ t('subscribe.text') }}</p>
            <div class="bq-done__actions">
              <button class="btn btn--red" type="button" :disabled="sending" @click="confirm">
                {{ sending ? t('lunch.order.sending') : t('subscribe.confirm') }}
              </button>
            </div>
            <p v-if="error" class="form__error" role="alert">{{ error }}</p>
          </template>
          <template v-else>
            <p class="quote">{{ t(`subscribe.${result}.title`) }}</p>
            <p>{{ t(`subscribe.${result}.text`) }}</p>
            <div class="bq-done__actions">
              <NuxtLink class="btn" :to="localePath('/news')">{{ t('subscribe.toNews') }}</NuxtLink>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
