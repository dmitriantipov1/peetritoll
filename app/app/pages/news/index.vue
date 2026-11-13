<script setup lang="ts">
// «Новости» (news.html прототипа): опубликованные новости, новые сверху, фильтр по темам
// (только темы, по которым есть новости) и «Показать ещё» по 9. Раздел «Новости» выключен — 404.
// Подписка на рассылку — следующий слой.
import type { SiteNewsCard } from '#shared/site-news'
import { newsTopics, type NewsTopic } from '#shared/materials'
import type { ContentLocale } from '#shared/locales'

const PAGE = 9

const { t, locale } = useI18n()

useHead({ title: () => `${t('news.title')} — Tavern Peetri Toll` })

const { data: news, error } = await useFetch<SiteNewsCard[]>('/api/site/news', {
  query: { locale },
})
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const topics = computed(() =>
  (Object.keys(newsTopics) as NewsTopic[]).filter((k) => news.value?.some((n) => n.topic === k)),
)
const topic = ref<NewsTopic | 'all'>('all')
const shown = ref(PAGE)
watch(topic, () => (shown.value = PAGE))

const filtered = computed(
  () => news.value?.filter((n) => topic.value === 'all' || n.topic === topic.value) ?? [],
)
const visible = computed(() => filtered.value.slice(0, shown.value))
</script>

<template>
  <div>
    <PageHero
      :title="t('news.title')"
      image="/images/restaurant-house.jpg"
      :crumb="t('news.title')"
      :lead="t('news.heroLead')"
    />

    <section id="novosti" class="section section--bg1">
      <div class="container">
        <SectionHead num="01" :crumb="t('news.crumb')" :title="t('news.title')" />

        <div v-if="topics.length > 1" class="chips" role="group" :aria-label="t('news.topics')">
          <button
            class="chip"
            :class="{ 'is-active': topic === 'all' }"
            type="button"
            :aria-pressed="topic === 'all'"
            @click="topic = 'all'"
          >
            {{ t('news.all') }}
          </button>
          <button
            v-for="k in topics"
            :key="k"
            class="chip"
            :class="{ 'is-active': topic === k }"
            type="button"
            :aria-pressed="topic === k"
            @click="topic = k"
          >
            {{ newsTopics[k][locale as ContentLocale] }}
          </button>
        </div>

        <ul v-if="visible.length" class="grid-3 news">
          <NewsCard v-for="n in visible" :key="n.id" :item="n" />
        </ul>
        <p v-else class="events-empty">{{ t('news.empty') }}</p>

        <div v-if="filtered.length > shown" class="center">
          <button class="btn" type="button" @click="shown += PAGE">{{ t('news.more') }}</button>
        </div>
      </div>
    </section>
  </div>
</template>
