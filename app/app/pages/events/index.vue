<script setup lang="ts">
// «Мероприятия»: тот же блок «Предстоящие / Архив», что на главной, но с полным архивом.
// В прототипе список — в «Музее» (museum.html#meropriyatiya); отдельный адрес /events нужен
// для ссылки «Все мероприятия» и для «крошек» страницы мероприятия. Раздел выключен — 404.
import type { SiteEvents } from '#shared/site-events'

const { t, locale } = useI18n()

useHead({ title: () => `${t('home.events.title')} — Tavern Peetri Toll` })

const { data: events, error } = await useFetch<SiteEvents>('/api/site/events', {
  query: { locale },
})
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}
</script>

<template>
  <div v-if="events">
    <PageHero
      :title="t('home.events.title')"
      image="/images/restaurant-hall.jpg"
      :crumb="t('home.events.title')"
      :lead="t('events.heroLead')"
    />
    <EventsBlock :events="events" num="01" />
  </div>
</template>
