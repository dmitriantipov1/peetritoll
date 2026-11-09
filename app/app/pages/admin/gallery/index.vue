<script setup lang="ts">
// Галерея на странице «Ресторан» (блок «В объективе „Петровской Таможни“»).
// Разметка — из прототипа (admin/gallery.html): сетка фото с перетаскиванием,
// справа — выбранное фото: подпись на трёх языках, категория, «на сайте».
import { VueDraggable } from 'vue-draggable-plus'
import type { AdminGallery, AdminGalleryPhoto } from '#shared/gallery'
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'
import type { MediaImage } from '#shared/media'

definePageMeta({ layout: 'admin', access: ['gallery'] })
defineI18nRoute(false)
useHead({ title: 'Галерея — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('gallery', 'edit'))

const { data, error, refresh } = await useFetch<AdminGallery>('/api/admin/gallery', {
  deep: true,
})

const firstName = (names: Localized<string>) => names.ru || names.et || names.en || ''
const categoryName = (id: number) =>
  firstName(data.value?.categories.find((c) => c.id === id)?.names ?? {})

// ---------- Фильтр и порядок ----------

const category = ref<number | 'all'>('all')
const photos = computed(() => data.value?.photos ?? [])
const count = (id: number | 'all') =>
  id === 'all' ? photos.value.length : photos.value.filter((p) => p.categoryId === id).length

// Сетка — свой список: его переставляет перетаскивание. Порядок в базе один на всю галерею,
// поэтому перестановку внутри категории вписываем на места её фото в общем списке
const shown = ref<AdminGalleryPhoto[]>([])
watch(
  [photos, category],
  () => {
    shown.value = photos.value.filter(
      (p) => category.value === 'all' || p.categoryId === category.value,
    )
  },
  { immediate: true, deep: true },
)

// Обложка блока на сайте — первое фото, которое на сайте
const coverId = computed(() => photos.value.find((p) => p.isVisible)?.id)

const message = ref('')
const actionError = ref('')

async function saveOrder() {
  if (!data.value) return
  actionError.value = ''
  message.value = ''
  const ids = new Set(shown.value.map((p) => p.id))
  const queue = [...shown.value]
  data.value.photos = data.value.photos.map((p) => (ids.has(p.id) ? queue.shift()! : p))
  try {
    await $fetch<unknown>('/api/admin/gallery/photos/order', {
      method: 'PUT',
      body: { ids: data.value.photos.map((p) => p.id) },
    })
  } catch (e) {
    actionError.value = apiErrorMessage(e, 'Не удалось сохранить порядок. Попробуйте ещё раз.')
    await refresh()
  }
}

// ---------- Загрузка ----------

const fileInput = ref<HTMLInputElement>()
const dragOver = ref(false)
const uploading = ref('')
const uploadErrors = ref<string[]>([])

/** Куда кладём новые фото: в открытую категорию, на вкладке «Все» — в первую */
const uploadCategoryId = computed(() =>
  category.value === 'all' ? data.value?.categories[0]?.id : category.value,
)

async function upload(files: FileList | undefined | null) {
  const list = [...(files ?? [])].filter((f) => f.type.startsWith('image/'))
  const categoryId = uploadCategoryId.value
  if (!list.length || !canEdit.value || !categoryId) return
  uploadErrors.value = []
  message.value = ''
  let added = 0
  let lastId: number | null = null
  for (const [i, file] of list.entries()) {
    uploading.value = list.length > 1 ? `Загружаем ${i + 1} из ${list.length}…` : 'Загружаем…'
    try {
      const body = new FormData()
      body.append('file', file)
      const image = await $fetch<MediaImage>('/api/admin/media', { method: 'POST', body })
      const { id } = await $fetch<{ id: number }>('/api/admin/gallery/photos', {
        method: 'POST',
        body: { mediaId: image.id, categoryId },
      })
      lastId = id
      added++
    } catch (e) {
      uploadErrors.value.push(`${file.name}: ${apiErrorMessage(e, 'не удалось загрузить')}`)
    }
  }
  uploading.value = ''
  if (fileInput.value) fileInput.value.value = ''
  await refresh()
  if (added) {
    if (lastId) select(lastId)
    message.value = `Добавлено в «${categoryName(categoryId)}»: ${added}. Подпишите фото справа.`
  }
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  upload(event.dataTransfer?.files)
}

// ---------- Выбранное фото ----------

const selectedId = ref<number | null>(null)
const selected = computed(() => photos.value.find((p) => p.id === selectedId.value) ?? null)
const lang = ref<ContentLocale>('ru')

const form = reactive({
  categoryId: 0,
  isVisible: true,
  captions: { et: '', en: '', ru: '' } as Record<ContentLocale, string>,
})
const formSaved = ref('')
const dirty = computed(() => JSON.stringify(form) !== formSaved.value)

function select(id: number) {
  selectedId.value = id
  message.value = ''
  const p = selected.value
  if (!p) return
  form.categoryId = p.categoryId
  form.isVisible = p.isVisible
  for (const l of contentLocales) form.captions[l] = p.captions[l] ?? ''
  formSaved.value = JSON.stringify(form)
  photoError.value = ''
}

const saving = ref(false)
const photoError = ref('')

async function savePhoto() {
  if (!selected.value) return
  photoError.value = ''
  saving.value = true
  try {
    const captions = Object.fromEntries(
      contentLocales.filter((l) => form.captions[l].trim()).map((l) => [l, form.captions[l]]),
    )
    await $fetch<unknown>(`/api/admin/gallery/photos/${selected.value.id}`, {
      method: 'PUT',
      body: { categoryId: form.categoryId, isVisible: form.isVisible, captions },
    })
    await refresh()
    select(selected.value.id)
    message.value = 'Фото сохранено.'
  } catch (e) {
    photoError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

async function removePhoto() {
  if (!selected.value) return
  const name = firstName(selected.value.captions) || 'без подписи'
  if (!confirm(`Удалить фото «${name}» из галереи? Вернуть его можно только новой загрузкой.`))
    return
  try {
    await $fetch<unknown>(`/api/admin/gallery/photos/${selected.value.id}`, { method: 'DELETE' })
    selectedId.value = null
    await refresh()
  } catch (e) {
    photoError.value = apiErrorMessage(e, 'Не удалось удалить. Попробуйте ещё раз.')
  }
}

// ---------- Категории ----------

const showCategories = ref(false)
const addingCategory = ref(false)

type Done = (error?: string) => void

async function run(request: () => Promise<unknown>, done: Done, onSuccess?: () => void) {
  try {
    await request()
    onSuccess?.()
    await refresh()
    done()
  } catch (e) {
    done(apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.'))
  }
}

function saveCategory(id: number | null, names: Localized<string>, done: Done) {
  const url: string =
    id === null ? '/api/admin/gallery/categories' : `/api/admin/gallery/categories/${id}`
  run(
    () => $fetch<unknown>(url, { method: id === null ? 'POST' : 'PUT', body: { names } }),
    done,
    () => (addingCategory.value = false),
  )
}

function removeCategory(id: number, done: Done) {
  if (!confirm(`Удалить категорию «${categoryName(id)}»?`)) return done()
  run(
    () => $fetch<unknown>(`/api/admin/gallery/categories/${id}`, { method: 'DELETE' }),
    done,
    () => {
      if (category.value === id) category.value = 'all'
    },
  )
}

async function saveCategoryOrder() {
  if (!data.value) return
  actionError.value = ''
  try {
    await $fetch<unknown>('/api/admin/gallery/categories/order', {
      method: 'PUT',
      body: { ids: data.value.categories.map((c) => c.id) },
    })
  } catch (e) {
    actionError.value = apiErrorMessage(e, 'Не удалось сохранить порядок. Попробуйте ещё раз.')
    await refresh()
  }
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Содержимое</p>
        <h1 class="adm-top__title">Галерея</h1>
        <p class="adm-top__meta">
          Страница «Ресторан», блок «В объективе „Петровской Таможни“»
          <template v-if="data"> · {{ photos.length }} фото</template>
        </p>
      </div>
      <div class="adm-top__actions">
        <button
          class="btn btn--sm"
          type="button"
          :aria-expanded="showCategories"
          @click="showCategories = !showCategories"
        >
          {{ showCategories ? 'Скрыть категории' : 'Категории' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить галерею.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть галерею.</p>
    <p v-if="actionError" class="adm-alert" role="alert">{{ actionError }}</p>
    <p v-if="message" class="adm-alert" role="status">{{ message }}</p>

    <template v-if="data">
      <section
        v-if="showCategories"
        class="adm-panel"
        aria-labelledby="p-cats"
        style="margin-bottom: 24px"
      >
        <div class="adm-panel__head">
          <h2 id="p-cats" class="adm-panel__title">Категории</h2>
          <p class="adm-panel__hint">
            Вкладки над галереей на сайте. Удалить можно только пустую категорию
          </p>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th scope="col"><span class="adm-vh">Порядок</span></th>
                <th scope="col">ET</th>
                <th scope="col">EN</th>
                <th scope="col">RU</th>
                <th scope="col" class="num">Фото</th>
                <th scope="col"><span class="adm-vh">Действия</span></th>
              </tr>
            </thead>
            <VueDraggable
              v-model="data.categories"
              tag="tbody"
              handle=".adm-drag"
              :animation="150"
              :disabled="!canEdit"
              @end="saveCategoryOrder"
            >
              <AdminNamesRow
                v-for="c in data.categories"
                :id="c.id"
                :key="c.id"
                :draggable="canEdit"
                :names="c.names"
                :count="count(c.id)"
                :can-edit="canEdit"
                :delete-blocked="count(c.id) ? 'Сначала перенесите или удалите фото' : ''"
                @save="(p, done) => saveCategory(c.id, p.names, done)"
                @remove="(done) => removeCategory(c.id, done)"
              />
            </VueDraggable>
            <tbody v-if="addingCategory">
              <AdminNamesRow
                :id="null"
                :names="{}"
                :can-edit="canEdit"
                @save="(p, done) => saveCategory(null, p.names, done)"
                @cancel="addingCategory = false"
              />
            </tbody>
          </table>
        </div>
        <p v-if="canEdit && !addingCategory" style="margin-top: 14px">
          <button class="adm-link-btn" type="button" @click="addingCategory = true">
            + Добавить категорию
          </button>
        </p>
      </section>

      <div class="adm-filters">
        <ul class="chips" aria-label="Категория">
          <li>
            <button
              class="chip"
              :class="{ 'is-active': category === 'all' }"
              type="button"
              :aria-pressed="category === 'all'"
              @click="category = 'all'"
            >
              Все<span class="chip__count">{{ count('all') }}</span>
            </button>
          </li>
          <li v-for="c in data.categories" :key="c.id">
            <button
              class="chip"
              :class="{ 'is-active': category === c.id }"
              type="button"
              :aria-pressed="category === c.id"
              @click="category = c.id"
            >
              {{ firstName(c.names) }}<span class="chip__count">{{ count(c.id) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="adm-layout">
        <section class="adm-panel" aria-label="Фотографии">
          <div class="adm-panel__head">
            <h2 class="adm-panel__title">Фотографии</h2>
            <p class="adm-panel__hint">Порядок на сайте — как здесь, перетаскиванием</p>
          </div>

          <p v-if="!shown.length" class="adm-note" style="margin-bottom: 14px">
            {{
              category === 'all' ? 'В галерее пока нет фото.' : 'В этой категории пока нет фото.'
            }}
          </p>
          <VueDraggable
            v-model="shown"
            tag="ul"
            class="adm-photos"
            handle=".adm-drag"
            :animation="150"
            :disabled="!canEdit"
            @end="saveOrder"
          >
            <li
              v-for="p in shown"
              :key="p.id"
              class="adm-photo"
              :class="{ 'is-selected': p.id === selectedId, 'is-hidden': !p.isVisible }"
            >
              <span v-if="canEdit" class="adm-drag" title="Перетащите, чтобы поменять порядок">
                <AdminDragIcon />
              </span>
              <span v-if="!p.isVisible" class="adm-photo__badge">Скрыто</span>
              <span
                v-else-if="p.id === coverId"
                class="adm-photo__badge"
                title="Первое фото на сайте — обложка блока"
              >
                Обложка
              </span>
              <button
                class="adm-photo__pick"
                type="button"
                :aria-label="`Выбрать фото: ${firstName(p.captions) || 'без подписи'}`"
                :aria-pressed="p.id === selectedId"
                @click="select(p.id)"
              >
                <img :src="p.image.url" :srcset="p.image.srcset" sizes="240px" alt="" />
              </button>
              <div class="adm-photo__body">
                <p :class="{ 'adm-note': !firstName(p.captions) }">
                  {{ firstName(p.captions) || 'Без подписи' }}
                </p>
                <AdminLangBadges :has="(l) => !!p.captions[l]" />
              </div>
            </li>
          </VueDraggable>

          <div
            v-if="canEdit"
            class="adm-photo--add adm-gallery-drop"
            :class="{ 'is-over': dragOver }"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onDrop"
          >
            <template v-if="uploading">
              <b>{{ uploading }}</b>
              Уменьшаем и сохраняем
            </template>
            <template v-else>
              <b>+ Добавить фото</b>
              <span>
                Перетащите файлы сюда или
                <button class="adm-link-btn" type="button" @click="fileInput?.click()">
                  выберите
                </button>
              </span>
              <span>
                JPG, PNG или WebP до 15 МБ, от 600 px · в «{{
                  uploadCategoryId ? categoryName(uploadCategoryId) : '—'
                }}»
              </span>
            </template>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              hidden
              @change="upload(($event.target as HTMLInputElement).files)"
            />
          </div>
          <ul v-if="uploadErrors.length" class="adm-note adm-danger" role="alert">
            <li v-for="e in uploadErrors" :key="e">{{ e }}</li>
          </ul>
        </section>

        <aside class="adm-stack" aria-label="Выбранное фото">
          <section v-if="selected" class="adm-panel" aria-labelledby="p-photo">
            <h2 id="p-photo" class="adm-panel__title" style="margin-bottom: 14px">
              Выбранное фото
            </h2>
            <img
              class="adm-preview"
              :src="selected.image.url"
              :srcset="selected.image.srcset"
              sizes="360px"
              :alt="firstName(form.captions)"
            />
            <fieldset :disabled="!canEdit" style="border: 0; padding: 0; margin: 0; min-width: 0">
              <div class="adm-lang-tabs" role="tablist" aria-label="Язык подписи">
                <button
                  v-for="l in contentLocales"
                  :key="l"
                  type="button"
                  role="tab"
                  :aria-selected="lang === l"
                  :class="{ 'is-untranslated': !form.captions[l].trim() }"
                  @click="lang = l"
                >
                  {{ l.toUpperCase() }}
                </button>
              </div>
              <div class="adm-stack" style="gap: 16px">
                <div class="field">
                  <label for="ph-cap">Подпись ({{ lang.toUpperCase() }})</label>
                  <input id="ph-cap" v-model="form.captions[lang]" type="text" maxlength="200" />
                  <span class="adm-note">Она же — описание для незрячих и поисковиков</span>
                </div>
                <div class="field">
                  <label for="ph-cat">Категория</label>
                  <select id="ph-cat" v-model="form.categoryId">
                    <option v-for="c in data.categories" :key="c.id" :value="c.id">
                      {{ firstName(c.names) }}
                    </option>
                  </select>
                </div>
                <label class="adm-switch">
                  <input v-model="form.isVisible" type="checkbox" />
                  <span class="adm-switch__track" />{{ form.isVisible ? 'На сайте' : 'Скрыто' }}
                </label>
              </div>
              <p v-if="photoError" class="adm-note adm-danger" role="alert">{{ photoError }}</p>
              <div v-if="canEdit" class="adm-actions">
                <button
                  class="btn btn--solid"
                  type="button"
                  :disabled="saving || !dirty"
                  @click="savePhoto"
                >
                  {{ saving ? 'Сохраняем…' : 'Сохранить' }}
                </button>
                <button class="adm-link-btn adm-danger" type="button" @click="removePhoto">
                  Удалить фото
                </button>
              </div>
            </fieldset>
          </section>
          <section class="adm-panel">
            <p class="adm-note">
              {{
                selected
                  ? 'Подпись и категорию сохраняет кнопка «Сохранить».'
                  : 'Нажмите на фото, чтобы подписать его, перенести в другую категорию или скрыть.'
              }}
            </p>
            <p class="adm-note" style="margin-top: 8px">
              Большие фото сайт уменьшает сам — можно загружать прямо с телефона или фотоаппарата.
            </p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
