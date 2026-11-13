<script setup lang="ts">
// «Экскурсии и поездки» (services.html прототипа): 01 экскурсии от Peetri Toll, 02 местные гиды,
// 03 мобильный аудиогид, 04 радиогиды, 05 Pakri Express (если раздел включён — ждёт условий,
// 7.2), 06 банкетный зал (если включён), 07 заявка. Номера разделов идут подряд.
// Тексты и цены пока в переводах, не в админке. Заявка — components/TourRequest.vue;
// кнопки «Заказать» выше сразу выбирают тему заявки.
import type { TourTopic } from '#shared/requests'
const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('services.title')} — Tavern Peetri Toll` })

const { data: s, error } = await useFetch<{ pakri: boolean; banquet: boolean; shop: boolean }>(
  '/api/site/services',
  { query: { locale } },
)
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: contacts } = await useSiteContacts()

// Номера по порядку показанных разделов: без Pakri Express и банкета — без пропусков
const order = computed(() =>
  [
    'tours',
    'guides',
    'audio',
    'radio',
    s.value?.pakri && 'pakri',
    s.value?.banquet && 'banquet',
    'request',
  ].filter(Boolean),
)
const num = (key: string) => String(order.value.indexOf(key) + 1).padStart(2, '0')

const tours = [
  { key: 'express', image: '/images/weapons-2.jpg', topic: 'exhibition' },
  { key: 'secrets', image: '/images/restaurant-house.jpg', topic: 'secrets' },
] as const

/** Тема заявки: кнопки «Заказать» выше выбирают её и ведут к форме */
const topic = ref<TourTopic>('exhibition')
</script>

<template>
  <div v-if="s">
    <PageHero
      :title="t('services.title')"
      image="/images/pakri-express.jpg"
      :crumb="t('nav.services')"
      :lead="t('services.heroLead')"
    />

    <!-- Экскурсии -->
    <section id="ekskursii" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('tours')"
          :crumb="t('services.tours.crumb')"
          :title="t('services.tours.title')"
        />
        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('services.tours.lead') }}</h3>
          <p>{{ t('services.tours.text') }}</p>
        </div>
        <ul class="grid-2">
          <li v-for="tour in tours" :key="tour.key" class="service">
            <PhotoFrame :src="tour.image" :alt="t(`services.tours.${tour.key}.alt`)" />
            <h3 class="service__title">{{ t(`services.tours.${tour.key}.title`) }}</h3>
            <p class="service__text">{{ t(`services.tours.${tour.key}.text`) }}</p>
            <p class="tile__meta">{{ t(`services.tours.${tour.key}.meta`) }}</p>
            <a class="service__link" href="#zayavka" @click="topic = tour.topic">{{
              t('services.order')
            }}</a>
          </li>
        </ul>
      </div>
    </section>

    <!-- Местные гиды -->
    <section id="gidy" class="section section--bg2">
      <div class="container">
        <SectionHead
          :num="num('guides')"
          :crumb="t('services.guides.crumb')"
          :title="t('services.guides.title')"
        />
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.guides.lead') }}</h3>
            <p>{{ t('services.guides.text') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('services.guides.langs') }}</dt>
                <dd>{{ t('services.guides.langsText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.guides.route') }}</dt>
                <dd>{{ t('services.guides.routeText') }}</dd>
              </div>
            </dl>
            <a class="btn" href="#zayavka" @click="topic = 'guide'">{{
              t('services.guides.order')
            }}</a>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/guides.jpg" :alt="t('services.guides.alt')" />
            <figcaption class="quote story__quote">
              {{ t('services.guides.quote1') }}<br /><span class="quote__indent">{{
                t('services.guides.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Мобильный аудиогид -->
    <section id="audiogid" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('audio')"
          :crumb="t('services.audio.crumb')"
          :title="t('services.audio.title')"
        />
        <div class="story story--reverse">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.audio.lead') }}</h3>
            <p>{{ t('services.audio.text') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('services.audio.walk') }}</dt>
                <dd>{{ t('services.audio.walkText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.audio.car') }}</dt>
                <dd>{{ t('services.audio.carText') }}</dd>
              </div>
            </dl>
            <p class="h4">{{ t('services.audio.how') }}</p>
            <ol class="steps">
              <li>{{ t('services.audio.step1') }}</li>
              <li>{{ t('services.audio.step2') }}</li>
              <li>{{ t('services.audio.step3') }}</li>
            </ol>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/audioguide.jpg" :alt="t('services.audio.alt')" />
            <figcaption class="quote story__quote">
              {{ t('services.audio.quote1') }}<br /><span class="quote__indent">{{
                t('services.audio.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Радиогиды -->
    <section id="radiogidy" class="section section--bg2">
      <div class="container">
        <SectionHead
          :num="num('radio')"
          :crumb="t('services.radio.crumb')"
          :title="t('services.radio.title')"
        />
        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('services.radio.lead') }}</h3>
          <p>{{ t('services.radio.text') }}</p>
        </div>
        <div class="radio-two">
          <div>
            <h3 class="ev-card__title">{{ t('services.radio.buy') }}</h3>
            <p class="ev-card__price">{{ t('services.radio.buyPrice') }}</p>
            <p>{{ t('services.radio.buyText') }}</p>
            <NuxtLink v-if="s.shop" class="btn btn--sm" :to="localePath('/shop')">{{
              t('services.radio.toShop')
            }}</NuxtLink>
          </div>
          <div>
            <h3 class="ev-card__title">{{ t('services.radio.rent') }}</h3>
            <p class="ev-card__price">{{ t('services.radio.rentPrice') }}</p>
            <p>{{ t('services.radio.rentText') }}</p>
            <a class="btn btn--sm btn--red" href="#zayavka" @click="topic = 'radioguides'">{{
              t('services.radio.request')
            }}</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Pakri Express — только если раздел включён -->
    <section v-if="s.pakri" id="pakri-express" class="section section--bg4">
      <div class="container">
        <SectionHead :num="num('pakri')" :crumb="t('services.pakri.crumb')" title="Pakri Express" />
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.pakri.lead') }}</h3>
            <p>{{ t('services.pakri.text') }}</p>
            <dl class="facts">
              <div v-for="k in ['trips', 'programs', 'rent'] as const" :key="k" class="facts__row">
                <dt>{{ t(`services.pakri.${k}`) }}</dt>
                <dd>{{ t(`services.pakri.${k}Text`) }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.pakri.start') }}</dt>
                <dd>
                  {{ t('services.pakri.startText')
                  }}<template v-if="contacts?.address">, {{ contacts.address }}</template>
                </dd>
              </div>
            </dl>
            <a class="btn" href="#zayavka" @click="topic = 'pakri'">{{
              t('services.pakri.schedule')
            }}</a>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/pakri-express.jpg" :alt="t('services.pakri.alt')" />
            <figcaption class="quote story__quote">
              {{ t('services.pakri.quote1') }}<br /><span class="quote__indent">{{
                t('services.pakri.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Банкетный зал — если запрос на банкет включён -->
    <section v-if="s.banquet" id="banketnyj-zal" class="section section--bg2">
      <div class="container">
        <SectionHead
          :num="num('banquet')"
          :crumb="t('services.banquet.crumb')"
          :title="t('services.banquet.title')"
          :more="{ to: localePath('/banquet'), label: t('home.more') }"
        />
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('banquet.hall.lead') }}</h3>
            <p>{{ t('services.banquet.text') }}</p>
            <dl class="facts">
              <div
                v-for="k in ['where', 'occasion', 'menu', 'prepay'] as const"
                :key="k"
                class="facts__row"
              >
                <dt>{{ t(`services.banquet.${k}`) }}</dt>
                <dd>{{ t(`services.banquet.${k}Text`) }}</dd>
              </div>
            </dl>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/banquet-hall.jpg" :alt="t('banquet.hall.photoAlt')" />
            <figcaption class="quote story__quote">
              {{ t('banquet.hall.quote1') }}<br /><span class="quote__indent">{{
                t('banquet.hall.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
        <div class="cta-row">
          <p class="note">{{ t('services.banquet.note') }}</p>
          <NuxtLink class="btn btn--red" :to="localePath('/banquet')">{{
            t('restaurant.toBanquet')
          }}</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Заявка -->
    <section id="zayavka" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('request')"
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
          <TourRequest v-model:topic="topic" :pakri="s.pakri" />
        </div>
      </div>
    </section>
  </div>
</template>
