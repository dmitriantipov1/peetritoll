<script setup lang="ts">
// «Ресторан» (restaurant.html прототипа): 01 залы и события, 02 меню (часы — из «Контактов
// и часов»), 03 галерея из базы с фильтром по категориям и фото крупно, 04 отзывы.
// «05 Забронировать стол» — components/TableBooking.vue, последним разделом: сначала гость
// знакомится с рестораном, потом бронирует (7.1). Раздел «Ресторан» выключен — 404.
import type { SiteRestaurant } from '#shared/site-restaurant'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('restaurant.title')} — Tavern Peetri Toll` })

const { data: r, error } = await useFetch<SiteRestaurant>('/api/site/restaurant', {
  query: { locale },
})
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: contacts } = await useSiteContacts()
const hoursRows = useHoursRows(() => contacts.value?.week)
const hours = computed(() => hoursRows.value.map((h) => `${h.days} ${h.text}`).join(', '))

const halls = ['hall', 'armoury', 'terrace'] as const
const hallImages = {
  hall: '/images/restaurant-hall.jpg',
  armoury: '/images/banquet-hall.jpg',
  terrace: '/images/terrace.jpg',
}
const formats = ['celebrations', 'business', 'rent', 'groups'] as const

// ---------- Галерея ----------

const category = ref<number | 'all'>('all')
const photos = computed(
  () =>
    r.value?.gallery?.photos.filter(
      (p) => category.value === 'all' || p.categoryId === category.value,
    ) ?? [],
)
const lightbox = ref<{ open: (id: number) => void } | null>(null)

const reviews = ['tripadvisor', 'google'] as const
</script>

<template>
  <div v-if="r">
    <PageHero
      :title="t('restaurant.title')"
      image="/images/restaurant-hall.jpg"
      :crumb="t('restaurant.title')"
      :lead="t('restaurant.heroLead')"
    />

    <!-- 01 Залы и события -->
    <section id="zaly" class="section section--bg1">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="t('restaurant.halls.crumb')"
          :title="t('restaurant.halls.title')"
        />

        <div class="intro">
          <div class="intro__text">
            <h3 class="intro__title">{{ t('restaurant.halls.lead') }}</h3>
            <p>{{ t('restaurant.halls.text') }}</p>
          </div>
          <div class="intro__aside">
            <ul class="formats">
              <li v-for="f in formats" :key="f">
                <b>{{ t(`restaurant.formats.${f}.title`) }}:</b>
                {{ t(`restaurant.formats.${f}.text`) }}
              </li>
            </ul>
          </div>
        </div>

        <ul class="halls">
          <li v-for="h in halls" :key="h" class="hall">
            <PhotoFrame :src="hallImages[h]" :alt="t(`restaurant.halls.${h}.alt`)" />
            <h4 class="hall__title">{{ t(`restaurant.halls.${h}.title`) }}</h4>
            <p class="hall__text">{{ t(`restaurant.halls.${h}.text`) }}</p>
          </li>
        </ul>

        <div v-if="r.links.group || r.links.banquet" class="cta-row">
          <p class="quote">
            {{ t('restaurant.quote1') }}<br /><span class="quote__indent">{{
              t('restaurant.quote2')
            }}</span>
          </p>
          <div class="cta-row__actions">
            <NuxtLink v-if="r.links.group" class="btn" :to="localePath('/group')">{{
              t('restaurant.toGroup')
            }}</NuxtLink>
            <NuxtLink v-if="r.links.banquet" class="btn btn--red" :to="localePath('/banquet')">{{
              t('restaurant.toBanquet')
            }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 02 Меню -->
    <section id="menyu" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="02"
          :crumb="t('restaurant.menu.crumb')"
          :title="t('restaurant.menu.title')"
          :more="
            r.links.menu ? { to: localePath('/menu'), label: t('restaurant.menu.all') } : undefined
          "
        />

        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('restaurant.menu.lead') }}</h3>
            <p>{{ t('restaurant.menu.text') }}</p>
            <dl class="facts">
              <div v-if="hours" class="facts__row">
                <dt>{{ t('restaurant.menu.hours') }}</dt>
                <dd>{{ hours }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('restaurant.menu.portions') }}</dt>
                <dd>{{ t('restaurant.menu.portionsText') }}</dd>
              </div>
              <div v-if="r.links.banquet" class="facts__row">
                <dt>{{ t('restaurant.menu.banquets') }}</dt>
                <dd>
                  {{ t('restaurant.menu.banquetsText') }}
                  <NuxtLink :to="localePath('/banquet')">{{
                    t('restaurant.menu.banquetsLink')
                  }}</NuxtLink>
                </dd>
              </div>
              <div v-if="r.links.group" class="facts__row">
                <dt>{{ t('restaurant.menu.groups') }}</dt>
                <dd>
                  {{ t('restaurant.menu.groupsText') }}
                  <NuxtLink :to="localePath('/group')">{{
                    t('restaurant.menu.groupsLink')
                  }}</NuxtLink>
                </dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('restaurant.menu.allergens') }}</dt>
                <dd>{{ t('restaurant.menu.allergensText') }}</dd>
              </div>
            </dl>
            <NuxtLink v-if="r.links.menu" class="btn" :to="localePath('/menu')">{{
              t('restaurant.menu.open')
            }}</NuxtLink>
          </div>

          <figure class="story__media">
            <PhotoFrame src="/images/dish-01.jpg" :alt="t('restaurant.menu.photoAlt')" />
            <figcaption class="quote story__quote">
              {{ t('restaurant.menu.quote1') }}<br /><span class="quote__indent">{{
                t('restaurant.menu.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 03 Галерея -->
    <section v-if="r.gallery" id="galereya" class="section section--bg4">
      <div class="container">
        <SectionHead
          num="03"
          :crumb="t('restaurant.gallery.crumb')"
          :title="t('restaurant.gallery.title')"
        />

        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('restaurant.gallery.lead') }}</h3>
        </div>

        <div
          v-if="r.gallery.categories.length > 1"
          class="chips"
          role="group"
          :aria-label="t('restaurant.gallery.categories')"
        >
          <button
            class="chip"
            :class="{ 'is-active': category === 'all' }"
            type="button"
            :aria-pressed="category === 'all'"
            @click="category = 'all'"
          >
            {{ t('news.all') }}
          </button>
          <button
            v-for="c in r.gallery.categories"
            :key="c.id"
            class="chip"
            :class="{ 'is-active': category === c.id }"
            type="button"
            :aria-pressed="category === c.id"
            @click="category = c.id"
          >
            {{ c.name }}
          </button>
        </div>

        <ul class="gallery">
          <li v-for="p in photos" :key="p.id">
            <button
              class="photo__frame gallery__open"
              type="button"
              :aria-label="t('restaurant.gallery.open', { caption: p.caption })"
              @click="lightbox?.open(p.id)"
            >
              <img
                :src="p.image.url"
                :srcset="p.image.srcset"
                sizes="(max-width: 640px) 50vw, 300px"
                :alt="p.caption"
                loading="lazy"
              />
            </button>
          </li>
        </ul>

        <GalleryLightbox ref="lightbox" :photos="photos" />
      </div>
    </section>

    <!-- 04 Отзывы -->
    <section id="otzyvy" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="r.gallery ? '04' : '03'"
          :crumb="t('restaurant.reviews.crumb')"
          :title="t('restaurant.reviews.title')"
        />
        <ul class="grid-2">
          <li v-for="rv in reviews" :key="rv" class="review">
            <p class="review__stars" :aria-label="t('restaurant.reviews.stars')">★★★★★</p>
            <p class="review__text">{{ t(`restaurant.reviews.${rv}.text`) }}</p>
            <p class="review__source">{{ t(`restaurant.reviews.${rv}.source`) }}</p>
          </li>
        </ul>

        <div class="cta-row">
          <p class="quote">
            {{ t('restaurant.reviews.quote1') }}<br /><span class="quote__indent">{{
              t('restaurant.reviews.quote2')
            }}</span>
          </p>
          <a v-if="r.booking" class="btn btn--red" href="#bron">{{
            t('restaurant.reviews.book')
          }}</a>
          <NuxtLink v-else class="btn btn--red" :to="localePath('/contacts')">{{
            t('restaurant.reviews.contact')
          }}</NuxtLink>
        </div>
      </div>
    </section>

    <TableBooking
      v-if="r.booking"
      :num="r.gallery ? '05' : '04'"
      :rules="r.booking"
      :server-now="r.now"
      :hours="hours"
      :banquet-link="r.links.banquet"
      :group-link="r.links.group"
    />
  </div>
</template>
