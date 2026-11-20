<script setup lang="ts">
// «Экскурсионные программы» (excursions.html прототипа, 20.11.2026): на «Услугах» блок с карточками
// был самым большим — там теперь короткий список со ссылками сюда. 01 программы карточками
// (из админки «Экскурсии»), 02 заявка — та же форма, что на «Услугах»; «Заказать» выбирает программу.
// Страница — часть «Экскурсий и поездок»: раздел выключен — 404.
import type { SiteTour } from '#shared/tours'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { meta, languages } = useTourText()

useHead({ title: () => `${t('excursions.title')} — Tavern Peetri Toll` })

const { data: s, error } = await useFetch<{ pakri: boolean; tours: SiteTour[] }>(
  '/api/site/services',
  { query: { locale } },
)
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: contacts } = await useSiteContacts()

/** Что интересует в заявке: «program:5» — программа, иначе тема */
const choice = ref(s.value?.tours[0] ? `program:${s.value.tours[0].id}` : 'other')
</script>

<template>
  <div v-if="s">
    <section class="page-hero">
      <img class="hero__bg" src="/images/weapons-1.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/services')">{{ t('nav.services') }}</NuxtLink> /
          {{ t('excursions.title') }}
        </p>
        <h1 class="page-hero__title">{{ t('excursions.title') }}</h1>
        <p class="page-hero__lead">{{ t('services.tours.lead') }}</p>
      </div>
    </section>

    <!-- 01 Программы — из админки «Экскурсии»: порядок, цены, гиды и языки ведёт заказчица -->
    <section id="programmy" class="section section--bg1">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="t('services.tours.crumb')"
          :title="t('services.tours.title')"
        />
        <div class="intro intro--single intro--wide">
          <h3 class="intro__title">{{ t('services.tours.lead') }}</h3>
          <p>{{ t('services.tours.text') }}</p>
        </div>
        <ul v-if="s.tours.length" class="grid-3">
          <li v-for="tour in s.tours" :id="`programma-${tour.id}`" :key="tour.id" class="service">
            <PhotoFrame :src="tour.photo?.url ?? tour.legacyPhoto ?? ''" :alt="tour.title" />
            <h3 class="service__title">{{ tour.title }}</h3>
            <p v-if="tour.text" class="service__text">{{ tour.text }}</p>
            <p class="tile__meta">{{ meta(tour) }}</p>
            <dl v-if="tour.guide || tour.languages.length" class="service__facts">
              <div v-if="tour.guide">
                <dt>{{ t('services.tours.guide') }}</dt>
                <dd>{{ tour.guide }}</dd>
              </div>
              <div v-if="tour.languages.length">
                <dt>{{ t('services.tours.langs') }}</dt>
                <dd>{{ languages(tour.languages) }}</dd>
              </div>
            </dl>
            <a class="btn" href="#zayavka" @click="choice = `program:${tour.id}`">{{
              t('services.order')
            }}</a>
          </li>
        </ul>
        <p v-else>{{ t('excursions.empty') }}</p>
      </div>
    </section>

    <!-- 02 Заявка -->
    <section id="zayavka" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="02"
          :crumb="t('services.request.crumb')"
          :title="t('services.request.title')"
        />
        <div class="two-col">
          <div class="prose">
            <h3 class="intro__title">{{ t('services.request.lead') }}</h3>
            <p>{{ t('services.request.text') }}</p>
            <dl class="facts">
              <div v-if="contacts?.phone" class="facts__row">
                <dt>{{ t('contacts.phone') }}</dt>
                <dd>
                  <a :href="`tel:${contacts.phone.replace(/[^\d+]/g, '')}`">{{ contacts.phone }}</a>
                </dd>
              </div>
              <div v-if="contacts?.email" class="facts__row">
                <dt>{{ t('contacts.email') }}</dt>
                <dd>
                  <a :href="`mailto:${contacts.email}`">{{ contacts.email }}</a>
                </dd>
              </div>
            </dl>
            <p class="quote">
              {{ t('services.request.quote1') }}<br /><span class="quote__indent">{{
                t('services.request.quote2')
              }}</span>
            </p>
          </div>
          <TourRequest v-model:choice="choice" :pakri="s.pakri" :tours="s.tours" />
        </div>
      </div>
    </section>
  </div>
</template>
