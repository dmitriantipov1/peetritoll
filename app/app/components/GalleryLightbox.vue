<script setup lang="ts">
// Фото галереи крупно: то же окно, что у блюд (.lightbox), но с подписью вместо названия и цены.
// Стрелки и ← → листают фото, которые сейчас видны (с учётом фильтра); Esc и клик мимо закрывают.
import type { SiteGalleryPhoto } from '#shared/site-restaurant'

const props = defineProps<{ photos: SiteGalleryPhoto[] }>()

const { t } = useI18n()
const dialog = ref<HTMLDialogElement | null>(null)
const current = ref(0)
const photo = computed(() => props.photos[current.value])

function open(id: number) {
  const i = props.photos.findIndex((p) => p.id === id)
  if (i < 0) return
  current.value = i
  dialog.value?.showModal()
}

function step(by: number) {
  const n = props.photos.length
  current.value = (current.value + by + n) % n
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') step(-1)
  if (e.key === 'ArrowRight') step(1)
}

function onClick(e: MouseEvent) {
  if (e.target === dialog.value) dialog.value?.close()
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="lightbox"
    :class="{ 'is-single': photos.length < 2 }"
    :aria-label="photo?.caption || t('restaurant.gallery.photo')"
    @keydown="onKey"
    @click="onClick"
  >
    <button
      class="lightbox__nav lightbox__nav--prev"
      type="button"
      :aria-label="t('menu.prev')"
      @click="step(-1)"
    >
      ‹
    </button>
    <button
      class="lightbox__nav lightbox__nav--next"
      type="button"
      :aria-label="t('menu.next')"
      @click="step(1)"
    >
      ›
    </button>
    <figure v-if="photo" class="lightbox__figure">
      <div class="lightbox__frame">
        <img
          class="lightbox__img"
          :src="photo.image.url"
          :srcset="photo.image.srcset"
          sizes="(max-width: 900px) 100vw, 880px"
          :alt="photo.caption"
        />
      </div>
      <figcaption v-if="photo.caption" class="lightbox__caption">
        <p class="lightbox__name">{{ photo.caption }}</p>
      </figcaption>
    </figure>
  </dialog>
</template>
