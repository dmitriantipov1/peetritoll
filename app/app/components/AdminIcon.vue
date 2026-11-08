<script setup lang="ts">
// Значки бокового меню админки — контуры из прототипа (admin/*.html).
// Разметка статичная и задана здесь же, поэтому v-html безопасен.
const icons = {
  requests: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  orders: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  menu: '<path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3"/><path d="M17 21V3c-2 0-3 3-3 6s1 4 3 4"/>',
  materials: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
  products: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  gallery: '<rect x="3" y="5" width="18" height="14"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
  leads:
    '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-3-1.7-5.3-4-5.9"/>',
  staff: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  contacts: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings:
    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
} as const

export type AdminIconName = keyof typeof icons

defineProps<{ name: AdminIconName }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons[name]" />
</template>
