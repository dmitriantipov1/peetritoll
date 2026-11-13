<script setup lang="ts">
// Фото блюда крупно (menu.html прототипа, <dialog class="lightbox lightbox--dish">): кадр 3:2,
// название с описанием слева, цена справа. Стрелки и ← → листают блюда с фото, которые сейчас
// видны (с учётом фильтра); Esc и клик мимо окна закрывают.
import type { SiteDish } from '#shared/site-menu'
import { formatPrice } from '#shared/money'

const props = defineProps<{ dishes: SiteDish[] }>()

const { t } = useI18n()
const dialog = ref<HTMLDialogElement | null>(null)
const current = ref(0)
const dish = computed(() => props.dishes[current.value])

function open(id: number) {
  const i = props.dishes.findIndex((d) => d.id === id)
  if (i < 0) return
  current.value = i
  dialog.value?.showModal()
}

function step(by: number) {
  const n = props.dishes.length
  current.value = (current.value + by + n) % n
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') step(-1)
  if (e.key === 'ArrowRight') step(1)
}

// Клик по затемнению: у <dialog> он приходит на сам элемент, а не на содержимое
function onClick(e: MouseEvent) {
  if (e.target === dialog.value) dialog.value?.close()
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="lightbox lightbox--dish"
    :class="{ 'is-single': dishes.length < 2 }"
    aria-labelledby="lightbox-name"
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
    <figure v-if="dish" class="lightbox__figure">
      <div class="lightbox__frame">
        <img
          class="lightbox__img"
          :src="dish.photo?.url"
          :srcset="dish.photo?.srcset ?? undefined"
          sizes="(max-width: 900px) 100vw, 880px"
          :alt="dish.name"
        />
      </div>
      <figcaption class="lightbox__caption">
        <div class="lightbox__head">
          <div class="lightbox__title">
            <p id="lightbox-name" class="lightbox__name">{{ dish.name }}</p>
            <p v-if="dish.description" class="lightbox__desc">{{ dish.description }}</p>
          </div>
          <div class="lightbox__price">
            <span v-if="dish.portions.length === 1" class="dish__price">{{
              formatPrice(dish.portions[0]!.priceCents)
            }}</span>
            <ul v-else class="dish__sizes">
              <li v-for="(p, i) in dish.portions" :key="i">
                <span class="dish__size">{{ p.label }}</span>
                <span class="dish__dots" aria-hidden="true" />
                <span class="dish__price">{{ formatPrice(p.priceCents) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </figcaption>
    </figure>
  </dialog>
</template>
