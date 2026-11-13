<script setup lang="ts">
// Мероприятие (event.html прототипа): «01 О мероприятии» — текст из админки, факты (когда, где,
// вход, запись) и афиша. Запись на мероприятие — следующий слой (раздел «02 Записаться»).
// Прошедшее (в архиве) — без записи, с пометкой. Адрес — слаг на языке страницы.
import type { SiteEventPage } from '#shared/site-events'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const setI18nParams = useSetI18nParams()

const slug = computed(() => String(route.params.slug))
const { data: ev, error } = await useFetch<SiteEventPage>('/api/site/events/item', {
  query: { locale, slug },
})
if (error.value || !ev.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

setI18nParams(Object.fromEntries(Object.entries(ev.value.slugs).map(([l, s]) => [l, { slug: s }])))
// В версии сайта, где мероприятия нет, переключатель ведёт на список мероприятий
setLangFallback(Object.keys(ev.value.slugs), (l) => localePath('/events', l))

useHead({ title: () => `${ev.value?.title ?? ''} — Tavern Peetri Toll` })

// Адрес — из «Контактов и часов» (тот же запрос, что у подвала)
const { data: contacts } = await useSiteContacts()
const where = computed(() => [ev.value?.place, contacts.value?.address].filter(Boolean).join(', '))

// Дата по Таллину, без часового пояса браузера
const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' })
const day = computed(() => (ev.value ? new Date(`${ev.value.date}T00:00:00Z`) : new Date()))
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** «18 октября, 18:00» — в герое */
const heroLead = computed(() => {
  if (!ev.value) return ''
  const date = fmt({ day: 'numeric', month: 'long' }).format(day.value)
  const when = ev.value.startTime ? `${date}, ${ev.value.startTime}` : date
  return ev.value.lead ? `${when} · ${ev.value.lead}` : when
})

/** «Суббота, 18 октября 2026, начало в 18:00» */
const when = computed(() => {
  if (!ev.value) return ''
  const date = capital(
    fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      .format(day.value)
      .replace(/\s*г\.$/, ''),
  )
  return ev.value.startTime ? t('events.whenStart', { date, time: ev.value.startTime }) : date
})
</script>

<template>
  <div v-if="ev">
    <section class="page-hero">
      <img class="hero__bg" src="/images/restaurant-hall.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/events')">{{ t('home.events.title') }}</NuxtLink>
          <template v-if="ev.kind"> / {{ ev.kind }}</template>
        </p>
        <h1 class="page-hero__title">{{ ev.title }}</h1>
        <p class="page-hero__lead">{{ heroLead }}</p>
      </div>
    </section>

    <section id="o-meropriyatii" class="section section--bg1">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="ev.kind ?? t('home.events.title')"
          :title="t('events.about')"
          :more="{ to: localePath('/events'), label: t('home.events.more') }"
        />

        <div class="story">
          <div class="story__text">
            <p v-if="ev.archived" class="note event-page__past">{{ t('events.past') }}</p>
            <!-- Текст из редактора админки, очищен на сервере при сохранении (server/utils/rich-text.ts) -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="ev.body" class="article--rich" v-html="ev.body" />
            <p v-else-if="ev.lead">{{ ev.lead }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('events.when') }}</dt>
                <dd>{{ when }}</dd>
              </div>
              <div v-if="where" class="facts__row">
                <dt>{{ t('events.where') }}</dt>
                <dd>{{ where }}</dd>
              </div>
              <div v-if="ev.priceNote" class="facts__row">
                <dt>{{ t('events.entry') }}</dt>
                <dd>{{ ev.priceNote }}</dd>
              </div>
              <div v-if="ev.registrationOpen" class="facts__row">
                <dt>{{ t('events.registration') }}</dt>
                <dd>{{ t('events.registrationText') }}</dd>
              </div>
            </dl>
          </div>

          <figure class="story__media">
            <div
              class="events__poster event-page__poster"
              :class="{ 'is-missing': !ev.poster }"
              :data-ph="ev.poster ? undefined : t('home.events.noPoster')"
            >
              <img
                v-if="ev.poster"
                class="is-active"
                :src="ev.poster.url"
                :srcset="ev.poster.srcset"
                sizes="(max-width: 860px) 100vw, 420px"
                :alt="t('home.events.poster', { title: ev.title })"
              />
            </div>
          </figure>
        </div>
      </div>
    </section>
  </div>
</template>
