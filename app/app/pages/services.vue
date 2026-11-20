<script setup lang="ts">
// «Экскурсии и поездки» (services.html прототипа): 01 экскурсии от Peetri Toll, 02 местные гиды (с карточками гидов),
// 03 мобильный аудиогид (коротко, подробности — на /audioguide с 20.11.2026), 04 радиогиды, 05 Pakri Express (если раздел включён — ждёт условий,
// 7.2), 06 заявка. Номера разделов идут подряд. Банкетного зала здесь нет (18.11.2026) — он в «Меню» и «Ресторане».
// Тексты и цены пока в переводах, не в админке. Заявка — components/TourRequest.vue;
// кнопки «Заказать» выше сразу выбирают тему заявки.
import type { TourTopic } from '#shared/requests'
import { guides, type Guide } from '~/utils/guides'
import { NAVICUP_URL } from '~/utils/audioguide'

const { t, locale } = useI18n()
const localePath = useLocalePath()

// «Эстонский, русский, английский» — с заглавной первое слово, как в тексте заказчицы
function guideLanguages(g: Guide) {
  const list = g.languages.map((l) => t(`services.guides.languages.${l}`)).join(', ')
  return list.charAt(0).toUpperCase() + list.slice(1)
}

useHead({ title: () => `${t('services.title')} — Tavern Peetri Toll` })

const { data: s, error } = await useFetch<{ pakri: boolean; banquet: boolean; shop: boolean }>(
  '/api/site/services',
  { query: { locale } },
)
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: contacts } = await useSiteContacts()

// Номера по порядку показанных разделов: без Pakri Express — без пропусков
const order = computed(() =>
  [
    'tours',
    'guides',
    'audio',
    'radio',
    s.value?.pakri && 'pakri',
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
        <!-- Текст во всю ширину, кнопки — обычные .btn (18.11.2026) -->
        <div class="intro intro--single intro--wide">
          <h3 class="intro__title">{{ t('services.tours.lead') }}</h3>
          <p>{{ t('services.tours.text') }}</p>
        </div>
        <ul class="grid-2">
          <li v-for="tour in tours" :key="tour.key" class="service">
            <PhotoFrame :src="tour.image" :alt="t(`services.tours.${tour.key}.alt`)" />
            <h3 class="service__title">{{ t(`services.tours.${tour.key}.title`) }}</h3>
            <p class="service__text">{{ t(`services.tours.${tour.key}.text`) }}</p>
            <p class="tile__meta">{{ t(`services.tours.${tour.key}.meta`) }}</p>
            <a class="btn" href="#zayavka" @click="topic = tour.topic">{{
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
        <!-- Фото — около 2/3 ширины (18.11.2026) -->
        <div class="story story--wide-media">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.guides.lead') }}</h3>
            <p>{{ t('services.guides.text') }}</p>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/guides.webp" :alt="t('services.guides.alt')" />
            <figcaption class="quote story__quote">
              {{ t('services.guides.quote1') }}<br /><span class="quote__indent">{{
                t('services.guides.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
        <!-- Гиды-партнёры (17.11.2026): связаться напрямую, кнопки в блоке нет (18.11.2026).
             Под фото: e-mail, телефон, языки; чего нет — строки нет -->
        <ul class="guides" :aria-label="t('services.guides.list')">
          <li v-for="g in guides" :key="g.name" class="guide">
            <PhotoFrame :src="g.photo" :alt="g.name" />
            <div class="guide__body">
              <h4 class="guide__name">{{ g.name }}</h4>
              <ul class="guide__contacts">
                <li v-if="g.email">
                  <a :href="`mailto:${g.email}`">{{ g.email }}</a>
                </li>
                <li>
                  <a :href="`tel:${g.phone}`">{{ g.phoneText }}</a>
                </li>
              </ul>
              <p v-if="g.languages.length" class="guide__langs">{{ guideLanguages(g) }}</p>
            </div>
          </li>
        </ul>
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
        <!-- Коротко (20.11.2026): подробности, фрагменты и «Как это работает» — на /audioguide -->
        <div class="story story--reverse story--third">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.audio.lead') }}</h3>
            <p>{{ t('services.audio.short') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('services.audio.walk') }}</dt>
                <dd>{{ t('services.audio.walkShort') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.audio.car') }}</dt>
                <dd>{{ t('services.audio.carText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.audio.ticket') }}</dt>
                <dd>{{ t('services.audio.ticketShort') }}</dd>
              </div>
            </dl>
            <p class="story__more">
              <NuxtLink class="btn" :to="localePath('/audioguide')">{{
                t('services.audio.more')
              }}</NuxtLink>
            </p>
          </div>
          <figure class="story__media">
            <!-- QR-код — в левом нижнем углу фото, нажимается только он (дизайнер, 20.11.2026) -->
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
            <!-- Подпись без принудительного переноса — в 2–3 строки сама (18.11.2026) -->
            <figcaption class="quote story__quote">{{ t('services.audio.quote') }}</figcaption>
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
        <!-- Сплошным текстом, условия — фактами с линиями, как у аудиогида; кнопка обычная (18.11.2026).
             Радиогиды — только аренда (15.11.2026): это устройства музея, не товар -->
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('services.radio.lead') }}</h3>
            <p>{{ t('services.radio.text') }}</p>
            <p>{{ t('services.radio.text2') }}</p>
            <p>{{ t('services.radio.handout') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('services.radio.price') }}</dt>
                <dd>{{ t('services.radio.priceText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.radio.payment') }}</dt>
                <dd>{{ t('services.radio.paymentText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('services.radio.deposit') }}</dt>
                <dd>{{ t('services.radio.depositText') }}</dd>
              </div>
            </dl>
            <a class="btn" href="#zayavka" @click="topic = 'radioguides'">{{
              t('services.radio.request')
            }}</a>
            <p class="form__note radio-two__support">{{ t('services.radio.support') }}</p>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/radioguides.jpg" :alt="t('services.radio.photoAlt')" />
          </figure>
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
