<script setup lang="ts">
// Главная — лендинг (index.html прототипа). Порядок разделов — звонок 06.11.2026:
// Ресторан → Выставка → Экскурсии и поездки → Магазин → Мероприятия.
// Тексты — в i18n/locales (home.*); магазин и мероприятия — из базы (/api/site/home),
// каждый раздел есть, только если включён в настройках сайта на этом языке.
import type { HomeData } from '#shared/home'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data } = await useFetch<HomeData>('/api/site/home', { query: { locale } })

useHead({ title: () => t('home.meta') })

// Картинки и ссылки — здесь, тексты — в переводах под тем же номером
const halls = ['/images/restaurant-hall.jpg', '/images/banquet-hall.jpg', '/images/terrace.jpg']
const services = [
  { image: '/images/restaurant-terrace.jpg', to: '/services#ekskursii' },
  { image: '/images/guides.jpg', to: '/services#gidy' },
  { image: '/images/audioguide.jpg', to: '/services#audiogid' },
  { image: '/images/pakri-express.jpg', to: '/services#pakri-express' },
]
const formats = 4
const facts = 4
</script>

<template>
  <div>
    <section class="hero">
      <img class="hero__bg" src="/images/hero.jpg" alt="" />
      <div class="container hero__content">
        <p class="hero__kicker">{{ t('home.hero.kicker') }}</p>
        <p class="hero__sub">{{ t('home.hero.sub') }}</p>
        <h1 class="hero__title">{{ t('home.hero.title') }}</h1>
        <p class="hero__quote">{{ t('home.hero.quote') }}</p>
        <div class="hero__actions">
          <NuxtLink class="btn btn--solid" :to="localePath('/menu')">{{
            t('home.hero.menu')
          }}</NuxtLink>
          <NuxtLink class="btn btn--light" :to="localePath('/banquet')">{{
            t('home.hero.banquet')
          }}</NuxtLink>
          <NuxtLink class="btn btn--light" :to="localePath('/group')">{{
            t('home.hero.group')
          }}</NuxtLink>
        </div>
      </div>
    </section>

    <!-- 01 Ресторан -->
    <section id="restoran" class="section section--bg1">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="t('home.restaurant.crumb')"
          :title="t('home.restaurant.title')"
          :more="{ to: localePath('/restaurant'), label: t('home.more') }"
        />

        <div class="intro">
          <div class="intro__text">
            <h3 class="intro__title">{{ t('home.restaurant.lead') }}</h3>
            <p>{{ t('home.restaurant.text') }}</p>
          </div>
          <div class="intro__aside">
            <ul class="formats">
              <li v-for="i in formats" :key="i">
                <b>{{ t(`home.restaurant.formats.${i - 1}.title`) }}</b>
                {{ t(`home.restaurant.formats.${i - 1}.text`) }}
              </li>
            </ul>
          </div>
        </div>

        <ul class="halls">
          <li v-for="(image, i) in halls" :key="image" class="hall">
            <PhotoFrame :src="image" :alt="t(`home.restaurant.halls.${i}.alt`)" />
            <h4 class="hall__title">{{ t(`home.restaurant.halls.${i}.title`) }}</h4>
            <p class="hall__text">{{ t(`home.restaurant.halls.${i}.text`) }}</p>
          </li>
        </ul>

        <div class="cta-row">
          <p class="quote">
            {{ t('home.restaurant.quote1') }}<br /><span class="quote__indent">{{
              t('home.restaurant.quote2')
            }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- 02 Выставка -->
    <section id="vystavka" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="02"
          :crumb="t('home.exhibition.crumb')"
          :title="t('home.exhibition.title')"
          :more="{ to: localePath('/museum') + '#vystavka', label: t('home.more') }"
        />

        <div class="exhibition">
          <div class="exhibition__text">
            <h3 class="intro__title">{{ t('home.exhibition.lead') }}</h3>
            <p class="exhibition__sub">{{ t('home.exhibition.sub') }}</p>
            <p>{{ t('home.exhibition.text') }}</p>
            <dl class="facts">
              <div v-for="i in facts" :key="i" class="facts__row">
                <dt>{{ t(`home.exhibition.facts.${i - 1}.term`) }}</dt>
                <dd>{{ t(`home.exhibition.facts.${i - 1}.text`) }}</dd>
              </div>
            </dl>
          </div>

          <div class="exhibition__gallery">
            <figure class="photo">
              <PhotoFrame src="/images/weapons-1.jpg" :alt="t('home.exhibition.alt1')" />
            </figure>
            <figure class="photo exhibition__wide">
              <PhotoFrame src="/images/weapons-3.jpg" :alt="t('home.exhibition.alt2')" />
            </figure>
            <p class="quote exhibition__quote">{{ t('home.exhibition.quote') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 03 Экскурсии и поездки -->
    <section id="uslugi" class="section section--bg4">
      <div class="container">
        <SectionHead
          num="03"
          :crumb="t('home.services.crumb')"
          :title="t('home.services.title')"
          :more="{ to: localePath('/services'), label: t('home.services.more') }"
        />

        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('home.services.lead') }}</h3>
          <p>{{ t('home.services.text') }}</p>
        </div>

        <ul class="services">
          <li v-for="(s, i) in services" :key="s.to" class="service">
            <PhotoFrame :src="s.image" :alt="t(`home.services.items.${i}.alt`)" />
            <h4 class="service__title">{{ t(`home.services.items.${i}.title`) }}</h4>
            <p class="service__text">{{ t(`home.services.items.${i}.text`) }}</p>
            <NuxtLink class="service__link" :to="localePath(s.to)">{{
              t(`home.services.items.${i}.link`)
            }}</NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <HomeShop v-if="data?.shop" :shop="data.shop" />
    <EventsBlock v-if="data?.events" :events="data.events" num="05" more />
  </div>
</template>
