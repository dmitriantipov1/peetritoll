<script setup lang="ts">
// Новость (news-item.html прототипа). С 16.11.2026 — как обычные страницы: герой «Новости»,
// «01» — над заголовком дата, заголовок — название; слева «коротко» подзаголовком и текст
// из редактора, справа обложка и строка хэштегов (тема и свои из админки); «02 Другие новости».
// Адрес — слаг на языке страницы; переключатель языков ведёт на адрес этой же новости.
import type { SiteNewsItem } from '#shared/site-news'
import { newsTopics } from '#shared/materials'
import type { ContentLocale } from '#shared/locales'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const setI18nParams = useSetI18nParams()

const slug = computed(() => String(route.params.slug))
const { data: item, error } = await useFetch<SiteNewsItem>('/api/site/news/item', {
  query: { locale, slug },
})
if (error.value || !item.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

setI18nParams(
  Object.fromEntries(Object.entries(item.value.slugs).map(([l, s]) => [l, { slug: s }])),
)
// В версии сайта, где новости нет, переключатель ведёт на список новостей
setLangFallback(Object.keys(item.value.slugs), (l) => localePath('/news', l))

useHead({ title: () => `${item.value?.title ?? ''} — Tavern Peetri Toll` })

const date = computed(() =>
  item.value
    ? new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Tallinn',
      })
        .format(new Date(item.value.publishedAt))
        .replace(/\s*г\.$/, '')
    : '',
)
// Хэштеги под фото: сначала тема новости («#Мероприятия»), потом свои из админки, без повторов
const tags = computed(() => {
  if (!item.value) return []
  const topic = item.value.topic
    ? newsTopics[item.value.topic][locale.value as ContentLocale].replace(/\s+/g, '')
    : null
  const all = topic ? [topic, ...item.value.tags] : item.value.tags
  return all
    .filter((tag, i) => all.findIndex((x) => x.toLowerCase() === tag.toLowerCase()) === i)
    .map((tag) => `#${tag}`)
})
</script>

<template>
  <div v-if="item">
    <!-- Герой — «Новости», главный заголовок страницы (h1) — название новости в «01» -->
    <section class="page-hero">
      <img class="hero__bg" src="/images/restaurant-house.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/news')">{{ t('news.title') }}</NuxtLink>
        </p>
        <p class="page-hero__title">{{ t('news.title') }}</p>
        <p class="page-hero__lead">{{ t('news.heroLead') }}</p>
      </div>
    </section>

    <section id="novost" class="section section--bg1">
      <div class="container">
        <header class="section-head">
          <p class="section-head__crumb">
            <time :datetime="item.publishedAt">{{ date }}</time>
          </p>
          <h1 class="section-head__title">
            <span class="section-head__num">01</span> {{ item.title }}
          </h1>
          <NuxtLink class="section-head__more" :to="localePath('/news')">{{
            t('news.allNews')
          }}</NuxtLink>
        </header>
        <div class="story story--sticky news-story">
          <div class="story__text">
            <h2 v-if="item.lead" class="intro__title">{{ item.lead }}</h2>
            <!-- Текст из редактора админки, очищен на сервере при сохранении (server/utils/rich-text.ts) -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="article--rich" v-html="item.body" />
            <p class="article__back">
              <NuxtLink class="link-more" :to="localePath('/news')"
                >← {{ t('news.allNews') }}</NuxtLink
              >
            </p>
          </div>
          <figure class="story__media">
            <PhotoFrame :src="item.cover?.url ?? '/images/restaurant-house.jpg'" :alt="item.title" />
            <ul v-if="tags.length" class="tags" :aria-label="t('news.tags')">
              <li v-for="tag in tags" :key="tag">{{ tag }}</li>
            </ul>
          </figure>
        </div>
      </div>
    </section>

    <section v-if="item.more.length" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="02"
          :crumb="t('news.crumb')"
          :title="t('news.other')"
          :more="{ to: localePath('/news'), label: t('news.allNews') }"
        />
        <ul class="grid-3 news">
          <NewsCard v-for="n in item.more" :key="n.id" :item="n" />
        </ul>
      </div>
    </section>
  </div>
</template>
