<script setup lang="ts">
// Загрузка картинки: перетащить файл или выбрать, заменить, убрать.
// Разметка и классы — из прототипа (admin/dish.html, панель «Фото»).
// Файл загружается сразу; к записи (блюду, товару) картинка привязывается при сохранении формы.
import { GOOD_WIDTH, type MediaImage } from '#shared/media'

const image = defineModel<MediaImage | null>('image', { required: true })
/** Старая ссылка на картинку (со старого сайта) — показываем, пока не заменили */
const legacy = defineModel<string | null>('legacy', { default: null })

const props = defineProps<{ disabled?: boolean; alt: string }>()

const input = ref<HTMLInputElement>()
const uploading = ref(false)
const dragOver = ref(false)
const error = ref('')

const preview = computed(() => image.value?.url ?? legacy.value)

async function upload(file: File | undefined) {
  if (!file || props.disabled) return
  error.value = ''
  uploading.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    image.value = await $fetch<MediaImage>('/api/admin/media', { method: 'POST', body })
    legacy.value = null
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось загрузить фото. Попробуйте ещё раз.')
  } finally {
    uploading.value = false
    if (input.value) input.value.value = '' // чтобы тот же файл можно было выбрать снова
  }
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  upload(event.dataTransfer?.files[0])
}

function clear() {
  image.value = null
  legacy.value = null
}
</script>

<template>
  <div>
    <div class="adm-upload">
      <img v-if="preview" :src="preview" :srcset="image?.srcset" sizes="220px" :alt="alt" />
      <span v-else class="adm-thumb--empty adm-upload__empty">нет фото</span>

      <div
        class="adm-upload__drop"
        :class="{ 'is-over': dragOver }"
        @dragover.prevent="dragOver = !disabled"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <p v-if="uploading">Загружаем и уменьшаем…</p>
        <template v-else>
          <p>{{ preview ? 'Перетащите новое фото сюда' : 'Перетащите фото сюда' }}</p>
          <button class="btn btn--sm" type="button" :disabled="disabled" @click="input?.click()">
            Выбрать файл
          </button>
          <button
            v-if="preview && !disabled"
            class="adm-link-btn adm-danger"
            type="button"
            @click="clear"
          >
            Убрать фото
          </button>
        </template>
        <input
          ref="input"
          class="adm-vh"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          :disabled="disabled"
          @change="upload(($event.target as HTMLInputElement).files?.[0])"
        />
      </div>
    </div>
    <p v-if="image && image.width < GOOD_WIDTH" class="adm-note adm-danger" style="margin-top: 8px">
      Фото маленькое ({{ image.width }}×{{ image.height }}) — на сайте будет мыльным. Загрузите
      крупнее, лучше от 1200 px.
    </p>
    <p v-if="legacy && !image" class="adm-note" style="margin-top: 8px">
      Фото пока по ссылке со старого сайта. Загрузите файл, чтобы оно хранилось у нас.
    </p>
    <p v-if="error" class="adm-note adm-danger" role="alert" style="margin-top: 8px">{{ error }}</p>
  </div>
</template>
