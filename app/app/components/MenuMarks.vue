<script setup lang="ts">
// Отметки блюда для гостей: значок-рисунок заказчицы, подпись — при наведении (title)
// и по нажатию на телефоне (data-open), где наведения нет. Без значка — текстом (например, «Острое»).
import { dietIcons, type SiteMark } from '#shared/site-menu'

defineProps<{
  keys: string[]
  marks: Map<string, SiteMark>
  /** Какой значок сейчас раскрыт нажатием — один на всю страницу */
  open: string | null
  id: string
}>()
defineEmits<{ toggle: [key: string | null] }>()

const { t } = useI18n()
</script>

<template>
  <ul v-if="keys.length" class="diet" :aria-label="t('menu.marks')">
    <template v-for="key in keys" :key="key">
      <li
        v-if="dietIcons[key]"
        class="diet__icon"
        :data-hint="marks.get(key)?.name"
        :data-open="open === `${id}:${key}` ? '' : undefined"
        @click.stop="$emit('toggle', open === `${id}:${key}` ? null : `${id}:${key}`)"
      >
        <img
          :src="dietIcons[key]"
          :alt="marks.get(key)?.name"
          :title="marks.get(key)?.name"
          width="28"
          height="27"
        />
      </li>
      <li v-else class="diet__tag" :class="`diet__tag--${key}`">{{ marks.get(key)?.name }}</li>
    </template>
  </ul>
</template>
