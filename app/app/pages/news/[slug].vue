<script setup lang="ts">
// Новость (news-item.html прототипа): герой с обложкой, дата и тема, «коротко» вводным абзацем,
// текст из редактора админки, «← Все новости» и три другие свежие новости.
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

const meta = computed(() => {
  if (!item.value) return ''
  const date = new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Tallinn',
  })
    .format(new Date(item.value.publishedAt))
    .replace(/\s*г\.$/, '')
  return item.value.topic
    ? `${date} · ${newsTopics[item.value.topic][locale.value as ContentLocale]}`
    : date
})
</script>

<template>
  <div v-if="item">
    <section class="page-hero">
      <img class="hero__bg" :src="item.cover?.url ?? '/images/restaurant-house.jpg'" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/news')">{{ t('news.title') }}</NuxtLink>
        </p>
        <h1 class="page-hero__title">{{ item.title }}</h1>
        <p class="page-hero__lead">{{ meta }}</p>
      </div>
    </section>

    <section class="section section--bg1">
      <div class="container">
        <article class="article">
          <p v-if="item.lead" class="lead">{{ item.lead }}</p>
          <!-- Текст из редактора админки, очищен на сервере при сохранении (server/utils/rich-text.ts) -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="article--rich" v-html="item.body" />
          <p class="article__back">
            <NuxtLink class="link-more" :to="localePath('/news')"
              >← {{ t('news.allNews') }}</NuxtLink
            >
          </p>
        </article>
      </div>
    </section>

    <section v-if="item.more.length" class="section section--bg2">
      <div class="container">
        <SectionHead
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
