<script setup lang="ts">
// Значки переводов ET / EN / RU: сплошной — перевод есть, пунктир — нет.
// Классы .adm-lang из прототипа (admin/menu.html).
import { contentLocales, type ContentLocale } from '#shared/locales'

defineProps<{ has: (locale: ContentLocale) => boolean }>()

const names: Record<ContentLocale, string> = {
  et: 'эстонский',
  en: 'английский',
  ru: 'русский',
}
</script>

<template>
  <span class="adm-langs" aria-label="Переводы">
    <span
      v-for="locale in contentLocales"
      :key="locale"
      class="adm-lang"
      :class="has(locale) ? 'adm-lang--ok' : 'adm-lang--missing'"
      :title="`${has(locale) ? 'Есть перевод' : 'Нет перевода'}: ${names[locale]}`"
    >
      {{ locale.toUpperCase() }}
    </span>
  </span>
</template>
