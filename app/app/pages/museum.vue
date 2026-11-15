<script setup lang="ts">
// «Музей живой истории» (museum.html прототипа, перенесено как есть 15.11.2026): выставка,
// экспонаты, визит, мероприятия (из базы — тот же блок, что на главной; раздел выключен —
// блока нет, номера сдвигаются), архивы, книги издательства (как в прототипе — со ссылками
// в SumUp-магазин), авторы со страницами-шаблонами. Тексты — в переводах (пока русские).
import type { SiteEvents } from '#shared/site-events'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('museum.title')} — Tavern Peetri Toll` })

// Раздел «Музей» выключен в настройках сайта — страницы нет
const { error: sectionOff } = await useFetch('/api/site/museum', { query: { locale } })
if (sectionOff.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: events } = await useFetch<SiteEvents | null>('/api/site/events', {
  query: { locale },
  default: () => null,
})

// Номера разделов по порядку показанных
const order = computed(() =>
  [
    'exhibition',
    'exhibits',
    'visit',
    events.value && 'events',
    'archives',
    'books',
    'authors',
  ].filter(Boolean),
)
const num = (key: string) => String(order.value.indexOf(key) + 1).padStart(2, '0')

const themes = ['military', 'art', 'exotic', 'secret'] as const
const exhibits = ['giant', 'women', 'oldest', 'dirk'] as const
const visitFacts = ['where', 'when', 'ticket', 'labels', 'tour'] as const
</script>

<template>
  <div>
    <PageHero
      :title="t('museum.title')"
      image="/images/weapons-2.jpg"
      :crumb="t('nav.museum')"
      :lead="t('museum.heroLead')"
    />

    <!-- Выставка -->
    <section id="vystavka" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('exhibition')"
          :crumb="t('museum.exhibition.crumb')"
          :title="t('museum.exhibition.title')"
        />
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('museum.exhibition.lead') }}</h3>
            <p>{{ t('museum.exhibition.text') }}</p>
            <div class="note">
              <p class="note__title">{{ t('museum.exhibition.filmTitle') }}</p>
              <p>{{ t('museum.exhibition.filmText') }}</p>
            </div>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/weapons-1.jpg" :alt="t('museum.exhibition.photoAlt')" />
            <figcaption class="quote story__quote">{{ t('museum.exhibition.quote') }}</figcaption>
          </figure>
        </div>
        <div class="subsection">
          <div class="subsection__head">
            <h3 class="h3">{{ t('museum.exhibition.themesTitle') }}</h3>
          </div>
          <ul class="grid-4">
            <li v-for="th in themes" :key="th" class="tile">
              <h4 class="tile__title">{{ t(`museum.exhibition.themes.${th}.title`) }}</h4>
              <p class="tile__text">{{ t(`museum.exhibition.themes.${th}.text`) }}</p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Экспонаты -->
    <section id="eksponaty" class="section section--bg2">
      <div class="container">
        <SectionHead
          :num="num('exhibits')"
          :crumb="t('museum.exhibits.crumb')"
          :title="t('museum.exhibits.title')"
        />
        <div class="story story--reverse">
          <div class="story__text">
            <h3 class="intro__title">{{ t('museum.exhibits.lead') }}</h3>
            <dl class="facts">
              <div v-for="e in exhibits" :key="e" class="facts__row">
                <dt>{{ t(`museum.exhibits.items.${e}.title`) }}</dt>
                <dd>{{ t(`museum.exhibits.items.${e}.text`) }}</dd>
              </div>
            </dl>
            <a class="btn" href="#vizit">{{ t('museum.exhibits.plan') }}</a>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/weapons-3.jpg" :alt="t('museum.exhibits.photoAlt')" />
            <figcaption class="quote story__quote">
              {{ t('museum.exhibits.quote1') }}<br /><span class="quote__indent">{{
                t('museum.exhibits.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- Визит -->
    <section id="vizit" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('visit')"
          :crumb="t('museum.visit.crumb')"
          :title="t('museum.visit.title')"
        />
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('museum.visit.lead') }}</h3>
            <dl class="facts">
              <div v-for="f in visitFacts" :key="f" class="facts__row">
                <dt>{{ t(`museum.visit.facts.${f}.title`) }}</dt>
                <dd>{{ t(`museum.visit.facts.${f}.text`) }}</dd>
              </div>
            </dl>
            <NuxtLink class="btn" :to="localePath('/services') + '#zayavka'">{{
              t('museum.orderTour')
            }}</NuxtLink>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/weapons-2.jpg" :alt="t('museum.visit.photoAlt')" />
            <div class="note story__note">
              <p class="note__title">{{ t('museum.visit.tempTitle') }}</p>
              <p>
                {{ t('museum.visit.tempText') }}
                <a v-if="events" href="#meropriyatiya">{{ t('museum.visit.tempLink') }}</a>
              </p>
            </div>
          </figure>
        </div>
      </div>
    </section>

    <!-- Мероприятия — из базы -->
    <EventsBlock
      v-if="events"
      :events="events"
      :num="num('events')"
      more
      bg="section--bg4"
      :lead="t('museum.events.lead')"
      :text="t('museum.events.text')"
    />

    <!-- Архивы -->
    <section id="arhivy" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('archives')"
          :crumb="t('museum.archives.crumb')"
          :title="t('museum.archives.title')"
        />
        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('museum.archives.lead') }}</h3>
        </div>
        <ul class="grid-2">
          <li v-for="a in ['photo', 'books'] as const" :key="a" class="tile">
            <h4 class="tile__title">{{ t(`museum.archives.${a}.title`) }}</h4>
            <p class="tile__text">{{ t(`museum.archives.${a}.text`) }}</p>
            <p class="tile__meta">{{ t(`museum.archives.${a}.meta`) }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- Книги — как в прототипе, покупка в SumUp-магазине -->
    <section id="knigi" class="section section--shop">
      <div class="container">
        <SectionHead
          :num="num('books')"
          :crumb="t('museum.books.crumb')"
          :title="t('museum.books.title')"
          :more="{ to: 'https://peetritoll.sumupstore.com/tooted', label: t('museum.books.all') }"
        />
        <ul class="products">
          <li v-for="b in museumBooks" :key="b.key" class="product">
            <div class="product__img">
              <img
                :src="b.cover"
                :alt="t('museum.books.cover', { title: t(`museum.books.items.${b.key}.title`) })"
                loading="lazy"
              />
            </div>
            <div class="product__body">
              <p class="product__cat">{{ t(`museum.books.items.${b.key}.author`) }}</p>
              <h3 class="product__name">
                <a class="product__link" :href="b.url" target="_blank" rel="noopener">{{
                  t(`museum.books.items.${b.key}.title`)
                }}</a>
              </h3>
              <p class="product__desc">{{ t(`museum.books.items.${b.key}.desc`) }}</p>
            </div>
            <div class="product__foot">
              <p class="product__price">{{ b.price }}</p>
              <a class="btn btn--sm" :href="b.url" target="_blank" rel="noopener">{{
                t('museum.books.buy')
              }}</a>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- Авторы -->
    <section id="avtory" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="num('authors')"
          :crumb="t('museum.authors.crumb')"
          :title="t('museum.authors.title')"
        />
        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('museum.authors.lead') }}</h3>
          <p>{{ t('museum.authors.text') }}</p>
        </div>
        <ul class="grid-3">
          <li v-for="a in museumAuthors" :key="a.slug" class="author">
            <NuxtLink class="author__photo" :to="localePath(`/authors/${a.slug}`)">
              <PhotoFrame :src="a.photo" :alt="t(`museum.authors.items.${a.slug}.name`)" />
            </NuxtLink>
            <p class="author__role">{{ t(`museum.authors.items.${a.slug}.role`) }}</p>
            <h3 class="author__name">{{ t(`museum.authors.items.${a.slug}.name`) }}</h3>
            <p>{{ t(`museum.authors.items.${a.slug}.text`) }}</p>
            <NuxtLink class="link-more" :to="localePath(`/authors/${a.slug}`)">{{
              t(`museum.authors.items.${a.slug}.link`)
            }}</NuxtLink>
          </li>
        </ul>
        <div class="cta-row">
          <p class="quote">
            {{ t('museum.quote1') }}<br /><span class="quote__indent">{{
              t('museum.quote2')
            }}</span>
          </p>
          <NuxtLink class="btn btn--red" :to="localePath('/services') + '#zayavka'">{{
            t('museum.orderTour')
          }}</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
