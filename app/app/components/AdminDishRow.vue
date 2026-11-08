<script setup lang="ts">
// Строка блюда в списке меню (pages/admin/menu/index.vue). Разметка — из прототипа (admin/menu.html).
import type { AdminDish } from '#shared/menu'
import { contentLocales, pickTranslation } from '#shared/locales'
import { formatPrice } from '#shared/money'

const props = defineProps<{
  dish: AdminDish
  canEdit: boolean
  /** Показать значок ⋮⋮ — за него строку перетаскивают */
  draggable: boolean
  labelNames: Map<number, string>
  tagNames: Map<number, string>
}>()

const emit = defineEmits<{ toggle: [] }>()

// Админка на русском: русский текст, нет его — эстонский, потом любой
const text = computed(() => {
  const rows = contentLocales.flatMap((locale) => {
    const t = props.dish.translations[locale]
    return t ? [{ locale, ...t }] : []
  })
  return pickTranslation(rows, 'ru')
})

const price = computed(() => {
  const { portions } = props.dish
  if (portions.length === 1) return formatPrice(portions[0]!.priceCents)
  // Несколько порций: «4,00 / 5,00 €»
  return `${portions.map((p) => formatPrice(p.priceCents).replace(' €', '')).join(' / ')} €`
})
</script>

<template>
  <tr :class="{ 'adm-row--hidden': !dish.isVisible }">
    <td>
      <span v-if="draggable" class="adm-drag" title="Перетащите, чтобы поменять порядок">
        <AdminDragIcon />
      </span>
    </td>
    <td>
      <img v-if="dish.photo" class="adm-thumb" :src="dish.photo" alt="" loading="lazy" />
      <span v-else class="adm-thumb--empty">нет фото</span>
    </td>
    <td>
      <NuxtLink class="adm-dish__name" :to="`/admin/menu/${dish.id}`">{{ text?.name }}</NuxtLink>
      <span v-for="labelId in dish.labelIds" :key="`l${labelId}`" class="adm-label">
        {{ labelNames.get(labelId) }}
      </span>
      <span v-for="tagId in dish.dietTagIds" :key="tagId" class="adm-diet">
        {{ tagNames.get(tagId) }}
      </span>
      <small v-if="text?.description">{{ text.description }}</small>
    </td>
    <td class="num">
      <span class="adm-price">{{ price }}</span>
    </td>
    <td>
      <AdminLangBadges :has="(locale) => !!dish.translations[locale]" />
    </td>
    <td>
      <label class="adm-switch">
        <input
          type="checkbox"
          :checked="dish.isVisible"
          :disabled="!canEdit"
          :aria-label="`Показывать на сайте: ${text?.name}`"
          @change="emit('toggle')"
        />
        <span class="adm-switch__track" />
        {{ dish.isVisible ? 'На сайте' : 'Скрыто' }}
      </label>
    </td>
    <td>
      <NuxtLink
        class="adm-open"
        :to="`/admin/menu/${dish.id}`"
        :aria-label="`${canEdit ? 'Изменить' : 'Открыть'}: ${text?.name}`"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </NuxtLink>
    </td>
  </tr>
</template>
