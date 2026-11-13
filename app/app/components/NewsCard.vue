<script setup lang="ts">
// Карточка новости (.news-card прототипа): обложка, «Май 2026 · Ресторан», заголовок, коротко.
// Без обложки — фото дома таможни.
import type { SiteNewsCard } from '#shared/site-news'
import { newsTopics } from '#shared/materials'
import type { ContentLocale } from '#shared/locales'

const props = defineProps<{ item: SiteNewsCard }>()

const { locale } = useI18n()
const localePath = useLocalePath()

const meta = computed(() => {
  const month = new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Tallinn',
  }).format(new Date(props.item.publishedAt))
  const parts = [month.charAt(0).toUpperCase() + month.slice(1).replace(/\s*г\.$/, '')]
  if (props.item.topic) parts.push(newsTopics[props.item.topic][locale.value as ContentLocale])
  return parts.join(' · ')
})
</script>

<template>
  <li class="news-card">
    <NuxtLink class="news-card__link" :to="localePath(`/news/${item.slug}`)">
      <PhotoFrame :src="item.cover?.url ?? '/images/restaurant-house.jpg'" :alt="item.title" />
      <p class="news__date">{{ meta }}</p>
      <h3 class="news__title">{{ item.title }}</h3>
      <p v-if="item.lead" class="news-card__text">{{ item.lead }}</p>
    </NuxtLink>
  </li>
</template>
