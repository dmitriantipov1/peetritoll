<script setup lang="ts">
// Фото в золотой рамке (.photo__frame из прототипа). Если файла нет — полосатая заглушка
// с именем файла, как в прототипе (js/main.js, markMissing): видно, какой картинки не хватает.
const props = defineProps<{
  src: string
  alt: string
  /** Без ленивой загрузки — для фото на первом экране */
  eager?: boolean
}>()

const img = ref<HTMLImageElement | null>(null)
const missing = ref(false)
const fileName = computed(() => props.src.split('/').pop() ?? '')

// Ошибка загрузки могла случиться до того, как страница ожила (картинка из серверной разметки)
onMounted(() => {
  if (img.value?.complete && img.value.naturalWidth === 0) missing.value = true
})
</script>

<template>
  <div
    class="photo__frame"
    :class="{ 'is-missing': missing }"
    :data-ph="missing ? fileName : undefined"
  >
    <img
      ref="img"
      :src="src"
      :alt="alt"
      :loading="eager ? undefined : 'lazy'"
      @error="missing = true"
    />
  </div>
</template>
