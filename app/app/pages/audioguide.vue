<script setup lang="ts">
// «Экскурсия с аудиогидом» (audioguide.html прототипа, 20.11.2026): на «Услугах» аудиогид был перегружен —
// там теперь короткий блок с кнопкой сюда. 01: слева главное (что, маршруты, цена, где купить),
// справа фрагменты (только на языке, где есть записи; фото нет — 20.11.2026); 02 как это работает.
// Страница — часть «Экскурсий и поездок»: раздел выключен — 404.
import { NAVICUP_URL, audioFiles } from '~/utils/audioguide'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('audioguide.title')} — Tavern Peetri Toll` })

const { error } = await useFetch('/api/site/services', { query: { locale } })
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const tracks = computed(() =>
  (audioFiles[locale.value] ?? []).map((f) => ({
    key: f.key,
    src: `/media/audioguide/${locale.value}/${f.file}`,
    seconds: f.seconds,
  })),
)
</script>

<template>
  <div>
    <section class="page-hero">
      <img class="hero__bg" src="/images/pakri-express.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/services')">{{ t('nav.services') }}</NuxtLink> /
          {{ t('nav.sub.services.audioguide') }}
        </p>
        <h1 class="page-hero__title">{{ t('audioguide.title') }}</h1>
        <p class="page-hero__lead">{{ t('services.audio.quote') }}</p>
      </div>
    </section>

    <!-- 01 Об аудиогиде -->
    <section id="ob-audiogide" class="section section--bg1">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="t('audioguide.about.crumb')"
          :title="t('audioguide.about.title')"
        />
        <!-- Нет записей на этом языке — текст во всю ширину, без колонок -->
        <div :class="tracks.length ? 'story story--aside story--sticky' : ''">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.audio.lead') }}</h3>
            <p>{{ t('services.audio.text') }}</p>
            <p>{{ t('services.audio.text2') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('services.audio.walk') }}</dt>
                <dd>{{ t('services.audio.walkText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.audio.car') }}</dt>
                <dd>{{ t('services.audio.carText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.audio.ticket') }}</dt>
                <dd>{{ t('services.audio.ticketText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.audio.langsTitle') }}</dt>
                <dd>{{ t('services.audio.langsText') }}</dd>
              </div>
            </dl>
            <p class="story__more">
              <a class="btn" :href="NAVICUP_URL" target="_blank" rel="noopener">{{
                t('services.audio.open')
              }}</a>
            </p>
          </div>
          <!-- Справа — фрагменты вместо фото (20.11.2026); только на языке, где есть записи (пока ru) -->
          <div v-if="tracks.length" class="story__media">
            <p class="h4">{{ t('audioguide.fragments.title') }}</p>
            <AudioTracks :tracks="tracks" :full-url="NAVICUP_URL" />
          </div>
        </div>
      </div>
    </section>

    <!-- Как это работает -->
    <section id="kak-nachat" class="section section--bg2">
      <div class="container">
        <SectionHead num="02" :crumb="t('audioguide.how.crumb')" :title="t('audioguide.how.title')" />
        <!-- Справа — фото с QR-кодом (20.11.2026, чтобы справа не было пустоты) -->
        <div class="story story--third">
          <div class="story__text">
          <ol class="steps">
            <li>{{ t('services.audio.step1') }}</li>
            <li>{{ t('services.audio.step2') }}</li>
            <li>{{ t('services.audio.step3') }}</li>
          </ol>
          <p>{{ t('services.audio.early') }}</p>
          <div class="note story__note story__note--mid">
            <p>
              <strong>{{ t('services.audio.headphones.lead') }}</strong>
              {{ t('services.audio.headphones.text') }}
            </p>
          </div>
          <p class="form__note">{{ t('services.audio.support') }}</p>
          </div>
          <figure class="story__media">
            <div class="story__photo">
              <PhotoFrame src="/images/audioguide.webp" :alt="t('services.audio.alt')" />
              <a
                class="qr-badge"
                :href="NAVICUP_URL"
                target="_blank"
                rel="noopener"
                :aria-label="t('services.audio.qrOpen')"
              >
                <img
                  src="/images/qr-navicup.png"
                  :alt="t('services.audio.qrAlt')"
                  width="120"
                  height="120"
                  loading="lazy"
                />
              </a>
            </div>
            <figcaption class="quote story__quote">{{ t('services.audio.quote') }}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  </div>
</template>
