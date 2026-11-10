<script setup lang="ts">
// Карточка товара (7.3, 7.4, 8.5): новый (product = null) или существующий. Разметка и классы —
// из прототипа (admin/product.html, admin/product-digital.html). Без права «правит» — только просмотр.
// Сохраняется целиком: переводы, фото, варианты. Файлы цифровых вариантов загружаются сразу,
// отдельно от «Сохранить», — поэтому только у уже сохранённого варианта.
import { VueDraggable } from 'vue-draggable-plus'
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { MediaImage } from '#shared/media'
import { formatPrice, parsePrice } from '#shared/money'
import { slugify } from '#shared/slug'
import {
  MAX_PRODUCT_FILE_MB,
  deliveryModes,
  productFileTypes,
  productStateNames,
  productStates,
  variantKindNames,
  variantKinds,
  type AdminProduct,
  type AdminProductFile,
  type AdminProductTranslation,
  type AdminShopCategory,
  type DeliveryMode,
  type ProductInputBody,
  type ProductState,
  type VariantKind,
} from '#shared/shop'

const props = defineProps<{
  product: AdminProduct | null
  categories: AdminShopCategory[]
  canEdit: boolean
}>()
const emit = defineEmits<{ saved: [product: AdminProduct] }>()

/** Получение в таблице вариантов — коротко; полностью — в подсказке под таблицей */
const deliveryShort: Record<DeliveryMode, string> = {
  pickup: 'Самовывоз',
  shipping: 'Самовывоз или доставка',
}

const localeNames: Record<ContentLocale, { what: string; where: string; version: string }> = {
  et: { what: 'эстонский', where: 'эстонской', version: 'Эстонская версия' },
  en: { what: 'английский', where: 'английской', version: 'Английская версия' },
  ru: { what: 'русский', where: 'русской', version: 'Русская версия' },
}

// ---------- Состояние формы ----------

interface VariantForm {
  /** Ключ строки для списка: у нового варианта номера ещё нет */
  key: string
  id: number | null
  kind: VariantKind
  price: string
  stock: string
  delivery: DeliveryMode
  isAvailable: boolean
  labels: Record<ContentLocale, string>
  files: Partial<Record<ContentLocale, AdminProductFile>>
}

let keySeq = 0
function variantForm(v?: AdminProduct['variants'][number]): VariantForm {
  return {
    key: v ? `v${v.id}` : `new${++keySeq}`,
    id: v?.id ?? null,
    kind: v?.kind ?? 'physical',
    price: v ? formatPrice(v.priceCents).replace(' €', '') : '',
    stock: v?.stock === null || v?.stock === undefined ? '' : String(v.stock),
    delivery: v?.delivery ?? 'shipping',
    isAvailable: v?.isAvailable ?? true,
    labels: Object.fromEntries(contentLocales.map((l) => [l, v?.labels[l] ?? ''])) as Record<
      ContentLocale,
      string
    >,
    files: { ...(v?.files ?? {}) },
  }
}

function initialState() {
  const p = props.product
  return {
    categoryId: p?.categoryId ?? props.categories[0]?.id ?? 0,
    state: p?.state ?? ('draft' as ProductState),
    locales: [...(p?.locales ?? [])] as ContentLocale[],
    translations: Object.fromEntries(
      contentLocales.map((l) => {
        const t = p?.translations[l]
        return [
          l,
          {
            name: t?.name ?? '',
            slug: t?.slug ?? '',
            lead: t?.lead ?? '',
            description: t?.description ?? '',
            facts: (t?.facts ?? []).map((f) => ({ ...f })),
          },
        ]
      }),
    ) as Record<ContentLocale, AdminProductTranslation>,
    photos: [...(p?.photos ?? [])] as MediaImage[],
    variants: p ? p.variants.map(variantForm) : [variantForm()],
  }
}

const form = reactive(initialState())
watch(
  () => props.product,
  () => Object.assign(form, initialState()),
)

// Админка на русском: открываем русский; если его нет — первый язык с названием
const lang = ref<ContentLocale>(
  !props.product || form.translations.ru.name
    ? 'ru'
    : (contentLocales.find((l) => form.translations[l].name) ?? 'ru'),
)
const t = computed(() => form.translations[lang.value])
const translated = (l: ContentLocale) => !!form.translations[l].name.trim()

// Адрес следует за названием, пока его не поправили руками
watch(
  () => contentLocales.map((l) => form.translations[l].name),
  (names, old) => {
    contentLocales.forEach((l, i) => {
      const tr = form.translations[l]
      if (!tr.slug || tr.slug === slugify(old?.[i] ?? '')) tr.slug = slugify(names[i] ?? '')
    })
  },
)

// Где показывать (8.5): у нового товара — языки, на которых есть название, пока переключатели
// не тронули. Забытый выключенным заметен, чужой язык в версии сайта — нет
const localesTouched = ref(!!props.product)
watch(
  () => contentLocales.filter(translated),
  (list) => {
    if (!localesTouched.value) form.locales = list
  },
)
function toggleLocale(l: ContentLocale, on: boolean) {
  localesTouched.value = true
  form.locales = contentLocales.filter((x) => (x === l ? on : form.locales.includes(x)))
}

// ---------- Характеристики ----------

function addFact() {
  t.value.facts.push({ label: '', value: '' })
}
function removeFact(i: number) {
  t.value.facts.splice(i, 1)
}

// ---------- Фото ----------

const photoInput = ref<HTMLInputElement>()
const uploading = ref(0)
const photoError = ref('')
const dragOver = ref(false)

async function uploadPhotos(files: FileList | null | undefined) {
  if (!files?.length || !props.canEdit) return
  photoError.value = ''
  for (const file of Array.from(files)) {
    uploading.value++
    try {
      const body = new FormData()
      body.append('file', file)
      form.photos.push(await $fetch<MediaImage>('/api/admin/media', { method: 'POST', body }))
    } catch (e) {
      photoError.value = apiErrorMessage(e, `Не удалось загрузить «${file.name}».`)
    } finally {
      uploading.value--
    }
  }
  if (photoInput.value) photoInput.value.value = ''
}
function removePhoto(id: string) {
  form.photos = form.photos.filter((p) => p.id !== id)
}

// ---------- Варианты ----------

function addVariant() {
  form.variants.push(variantForm())
}
function removeVariant(v: VariantForm) {
  const files = Object.keys(v.files).length
  if (
    files &&
    !confirm(`Удалить вариант вместе с файлами (${files})? Файлы сотрутся при сохранении товара.`)
  )
    return
  form.variants = form.variants.filter((x) => x !== v)
}

/** Языки, на которые нужен файл: где товар показан, плюс те, где файл уже есть */
function fileLocales(v: VariantForm): ContentLocale[] {
  return contentLocales.filter((l) => form.locales.includes(l) || v.files[l])
}

/** Ход загрузки файла, % — по ключу «вариант-язык» */
const fileProgress = reactive(new Map<string, number>())
const fileError = ref('')

/** Загрузка с ходом в процентах: аудиокнига — сотни мегабайт, $fetch хода не показывает */
function uploadFile(v: VariantForm, locale: ContentLocale, file: File | undefined) {
  if (!file || !v.id || !props.product) return
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!productFileTypes[ext]) {
    fileError.value = `Подходят файлы: ${Object.keys(productFileTypes).join(', ')}`
    return
  }
  if (file.size > MAX_PRODUCT_FILE_MB * 1024 * 1024) {
    fileError.value = `Файл больше ${MAX_PRODUCT_FILE_MB} МБ`
    return
  }
  fileError.value = ''
  const key = `${v.key}-${locale}`
  fileProgress.set(key, 0)
  const xhr = new XMLHttpRequest()
  xhr.open(
    'PUT',
    `/api/admin/products/${props.product.id}/variants/${v.id}/files/${locale}?name=${encodeURIComponent(file.name)}`,
  )
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) fileProgress.set(key, Math.round((e.loaded / e.total) * 100))
  }
  xhr.onload = () => {
    fileProgress.delete(key)
    if (xhr.status >= 200 && xhr.status < 300) {
      v.files[locale] = JSON.parse(xhr.responseText) as AdminProductFile
    } else {
      let message = 'Не удалось загрузить файл. Попробуйте ещё раз.'
      try {
        message = JSON.parse(xhr.responseText).message ?? message
      } catch {
        // ответ не JSON — оставляем общий текст
      }
      fileError.value = message
    }
  }
  xhr.onerror = () => {
    fileProgress.delete(key)
    fileError.value = 'Связь прервалась — загрузите файл ещё раз.'
  }
  xhr.send(file)
}

async function removeFile(v: VariantForm, locale: ContentLocale) {
  const file = v.files[locale]
  if (!file || !props.product) return
  if (!confirm(`Удалить файл «${file.filename}»?`)) return
  try {
    await $fetch(`/api/admin/products/${props.product.id}/files/${file.id}`, { method: 'DELETE' })
    v.files = Object.fromEntries(Object.entries(v.files).filter(([l]) => l !== locale))
  } catch (e) {
    fileError.value = apiErrorMessage(e, 'Не удалось удалить файл.')
  }
}

function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

// ---------- Сохранение ----------

const saving = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})

function toInput(): ProductInputBody | null {
  const variants: ProductInputBody['variants'] = []
  for (const [i, v] of form.variants.entries()) {
    const price = parsePrice(v.price)
    if (price === null) {
      issues.value = { [`variants.${i}`]: 'Цена — число, например 12,50' }
      return null
    }
    const stock = v.stock.trim() === '' ? null : Number(v.stock)
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      issues.value = { [`variants.${i}`]: 'Остаток — целое число или пусто' }
      return null
    }
    variants.push({
      id: v.id,
      kind: v.kind,
      priceCents: price,
      stock: v.kind === 'digital' ? null : stock,
      delivery: v.kind === 'digital' ? null : v.delivery,
      isAvailable: v.isAvailable,
      labels: Object.fromEntries(contentLocales.map((l) => [l, v.labels[l].trim()])),
    })
  }
  return {
    categoryId: form.categoryId,
    state: form.state,
    locales: form.locales,
    // Язык без названия не сохраняем — на сайте для него покажем эстонский текст
    translations: Object.fromEntries(
      contentLocales.filter(translated).map((l) => {
        const tr = form.translations[l]
        return [
          l,
          {
            name: tr.name.trim(),
            slug: tr.slug.trim(),
            lead: tr.lead,
            description: tr.description,
            facts: tr.facts.filter((f) => f.label.trim() || f.value.trim()),
          },
        ]
      }),
    ) as ProductInputBody['translations'],
    photoIds: form.photos.map((p) => p.id),
    variants,
  }
}

async function save() {
  error.value = ''
  issues.value = {}
  const input = toInput()
  if (!input) {
    error.value = Object.values(issues.value)[0] ?? 'Проверьте поля'
    return
  }
  saving.value = true
  try {
    if (props.product) {
      const saved = await $fetch<AdminProduct>(`/api/admin/products/${props.product.id}`, {
        method: 'PUT',
        body: input,
      })
      emit('saved', saved)
    } else {
      const { id } = await $fetch<{ id: number }>('/api/admin/products', {
        method: 'POST',
        body: input,
      })
      await navigateTo(`/admin/products/${id}`, { replace: true })
    }
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    issues.value = apiErrorIssues(e)
    // Ошибка в поле другого языка — открыть этот язык
    const bad = Object.keys(issues.value)
      .map((path) => path.split('.')[1])
      .find((l): l is ContentLocale => contentLocales.includes(l as ContentLocale))
    if (bad) lang.value = bad
  } finally {
    saving.value = false
  }
}

// ---------- Подписи ----------

const categoryName = (id: number) => {
  const names = props.categories.find((c) => c.id === id)?.names
  return names?.ru ?? names?.et ?? Object.values(names ?? {})[0] ?? ''
}
const title = computed(
  () =>
    t.value.name.trim() ||
    contentLocales.map((l) => form.translations[l].name.trim()).find(Boolean) ||
    'Новый товар',
)
const meta = computed(() => {
  const p = props.product
  const kinds = [...new Set(form.variants.map((v) => v.kind))]
  const parts = [
    kinds.length === 2
      ? 'Физический и цифровой'
      : `${variantKindNames[kinds[0] ?? 'physical']} товар`,
  ]
  if (
    form.variants.length === 1 &&
    form.variants[0]!.kind === 'physical' &&
    form.variants[0]!.stock === '1'
  ) {
    parts.push('единственный экземпляр')
  }
  if (p) {
    parts.push(`добавлен ${new Date(p.createdAt).toLocaleDateString('ru-RU')}`)
    parts.push(
      `изменён ${new Date(p.updatedAt).toLocaleDateString('ru-RU')}${p.updatedByName ? `, ${p.updatedByName}` : ''}`,
    )
  }
  return parts.join(' · ')
})
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <NuxtLink class="adm-back" to="/admin/products">
          ← Товары{{ form.categoryId ? ` · ${categoryName(form.categoryId)}` : '' }}
        </NuxtLink>
        <h1 class="adm-top__title">{{ title }}</h1>
        <p class="adm-top__meta">{{ meta }}</p>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" to="/admin/products">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving || uploading > 0">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

    <fieldset class="adm-fieldset" :disabled="!canEdit">
      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-text">
            <div class="adm-panel__head">
              <h2 id="p-text" class="adm-panel__title">Название и описание</h2>
              <p class="adm-panel__hint">Если перевода нет, покажем эстонский текст</p>
            </div>
            <div class="adm-lang-tabs" role="tablist" aria-label="Язык">
              <button
                v-for="l in contentLocales"
                :key="l"
                type="button"
                role="tab"
                :aria-selected="lang === l"
                :class="{ 'is-untranslated': !translated(l) }"
                :title="form.locales.includes(l) ? undefined : 'Скрыто в этой версии сайта'"
                @click="lang = l"
              >
                {{ l.toUpperCase() }}{{ form.locales.includes(l) ? '' : ' · скрыто' }}
              </button>
            </div>
            <div class="form" style="grid-template-columns: 1fr">
              <div class="field">
                <label for="p-name">Название ({{ localeNames[lang].what }})</label>
                <input id="p-name" v-model="t.name" type="text" maxlength="200" />
                <span v-if="issues.translations" class="adm-note adm-danger">
                  {{ issues.translations }}
                </span>
              </div>
              <div class="field">
                <label for="p-slug">Адрес страницы</label>
                <div class="adm-slug">
                  <span>peetritoll.ee/{{ lang }}/shop/</span>
                  <input
                    id="p-slug"
                    v-model="t.slug"
                    type="text"
                    maxlength="80"
                    spellcheck="false"
                    :aria-invalid="!!issues[`translations.${lang}.slug`]"
                  />
                </div>
                <span v-if="issues[`translations.${lang}.slug`]" class="adm-note adm-danger">
                  {{ issues[`translations.${lang}.slug`] }}
                </span>
                <span v-else class="adm-note"
                  >Собирается из названия; латиница, цифры и дефисы</span
                >
              </div>
              <div class="field">
                <label for="p-lead">Строка под названием — в карточке каталога</label>
                <input
                  id="p-lead"
                  v-model="t.lead"
                  type="text"
                  maxlength="300"
                  placeholder="Галина Малютина · 2022 · 144 стр."
                />
              </div>
              <div class="field">
                <label for="p-desc">Описание — на странице товара</label>
                <textarea id="p-desc" v-model="t.description" rows="6" maxlength="5000" />
              </div>
              <div class="field">
                <span class="adm-legend-title">Характеристики</span>
                <div v-for="(f, i) in t.facts" :key="i" class="adm-fact-row">
                  <input
                    v-model="f.label"
                    type="text"
                    maxlength="60"
                    placeholder="Размер"
                    :aria-label="`Характеристика ${i + 1}: что`"
                  />
                  <input
                    v-model="f.value"
                    type="text"
                    maxlength="200"
                    placeholder="30 × 22 см"
                    :aria-label="`Характеристика ${i + 1}: значение`"
                  />
                  <button
                    v-if="canEdit"
                    class="adm-link-btn"
                    type="button"
                    :aria-label="`Убрать характеристику ${i + 1}`"
                    @click="removeFact(i)"
                  >
                    ×
                  </button>
                </div>
                <p v-if="canEdit">
                  <button class="adm-link-btn" type="button" @click="addFact">
                    + Характеристика
                  </button>
                </p>
              </div>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-photos">
            <div class="adm-panel__head">
              <h2 id="p-photos" class="adm-panel__title">Фото</h2>
              <p class="adm-panel__hint">Первое — обложка в каталоге. Порядок — перетаскиванием</p>
            </div>
            <VueDraggable
              v-model="form.photos"
              class="adm-pphotos"
              :animation="150"
              :disabled="!canEdit"
            >
              <figure v-for="(ph, i) in form.photos" :key="ph.id" class="adm-pphotos__item">
                <img :src="ph.url" alt="" loading="lazy" />
                <b v-if="i === 0">Обложка</b>
                <button
                  v-if="canEdit"
                  type="button"
                  :aria-label="`Убрать фото ${i + 1}`"
                  @click="removePhoto(ph.id)"
                >
                  ×
                </button>
              </figure>
            </VueDraggable>
            <label
              v-if="canEdit"
              class="adm-upload__drop adm-gallery-drop"
              :class="{ 'is-over': dragOver }"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="((dragOver = false), uploadPhotos($event.dataTransfer?.files))"
            >
              <input
                ref="photoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                class="adm-vh"
                @change="uploadPhotos(($event.target as HTMLInputElement).files)"
              />
              {{
                uploading
                  ? `Загружаем… осталось ${uploading}`
                  : 'Перетащите фото сюда или нажмите, чтобы выбрать. JPG, PNG, WebP до 15 МБ'
              }}
            </label>
            <p v-if="photoError" class="adm-note adm-danger">{{ photoError }}</p>
            <p v-if="!form.photos.length && !canEdit" class="adm-note">Фото нет</p>
          </section>

          <section class="adm-panel" aria-labelledby="p-variants">
            <div class="adm-panel__head">
              <h2 id="p-variants" class="adm-panel__title">Варианты</h2>
              <p class="adm-panel__hint">
                То, что кладут в корзину: «Печатная книга» и «PDF». У простого товара — один, без
                подписи
              </p>
            </div>
            <div class="adm-table-wrap adm-scroll-x">
              <table class="adm-table adm-vtable">
                <thead>
                  <tr>
                    <th scope="col"><span class="adm-vh">Порядок</span></th>
                    <th scope="col">Подпись ({{ lang.toUpperCase() }})</th>
                    <th scope="col">Вид</th>
                    <th scope="col">Цена, €</th>
                    <th scope="col">Остаток</th>
                    <th scope="col">Получение</th>
                    <th scope="col">В продаже</th>
                    <th scope="col"><span class="adm-vh">Удалить</span></th>
                  </tr>
                </thead>
                <VueDraggable
                  v-model="form.variants"
                  tag="tbody"
                  handle=".adm-drag"
                  :animation="150"
                  :disabled="!canEdit"
                >
                  <tr v-for="(v, i) in form.variants" :key="v.key">
                    <td>
                      <span
                        v-if="canEdit && form.variants.length > 1"
                        class="adm-drag"
                        title="Перетащите, чтобы поменять порядок"
                        ><AdminDragIcon
                      /></span>
                    </td>
                    <td>
                      <input
                        v-model="v.labels[lang]"
                        type="text"
                        maxlength="100"
                        :placeholder="form.variants.length > 1 ? 'Например, PDF' : 'Не нужна'"
                        :aria-label="`Вариант ${i + 1}: подпись`"
                      />
                      <small v-if="issues[`variants.${i}`]" class="adm-danger">
                        {{ issues[`variants.${i}`] }}
                      </small>
                    </td>
                    <td>
                      <select v-model="v.kind" :aria-label="`Вариант ${i + 1}: вид`">
                        <option v-for="k in variantKinds" :key="k" :value="k">
                          {{ variantKindNames[k] }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        v-model="v.price"
                        type="text"
                        inputmode="decimal"
                        style="width: 90px"
                        :aria-label="`Вариант ${i + 1}: цена`"
                      />
                    </td>
                    <td>
                      <input
                        v-if="v.kind === 'physical'"
                        v-model="v.stock"
                        type="number"
                        min="0"
                        style="width: 80px"
                        placeholder="не считаем"
                        :aria-label="`Вариант ${i + 1}: остаток`"
                      />
                      <span v-else class="adm-note">—</span>
                    </td>
                    <td>
                      <select
                        v-if="v.kind === 'physical'"
                        v-model="v.delivery"
                        :aria-label="`Вариант ${i + 1}: получение`"
                      >
                        <option v-for="d in deliveryModes" :key="d" :value="d">
                          {{ deliveryShort[d] }}
                        </option>
                      </select>
                      <span v-else class="adm-note">ссылкой на почту</span>
                    </td>
                    <td>
                      <input
                        v-model="v.isAvailable"
                        type="checkbox"
                        :aria-label="`Вариант ${i + 1}: в продаже`"
                      />
                    </td>
                    <td>
                      <button
                        v-if="canEdit && form.variants.length > 1"
                        class="adm-link-btn adm-danger"
                        type="button"
                        :aria-label="`Удалить вариант ${i + 1}`"
                        @click="removeVariant(v)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </VueDraggable>
              </table>
            </div>
            <p v-if="canEdit" style="margin-top: 12px">
              <button class="adm-link-btn" type="button" @click="addVariant">+ Вариант</button>
            </p>
            <p class="adm-note" style="margin-top: 8px">
              Остаток пустой — не считаем (тираж, цифровой). Антиквариат — 1: пока покупатель
              оплачивает, вещь закреплена за ним (с оплатой, этап 4). «Самовывоз» — только в
              Палдиски, для картин и антиквариата: посылки не страхуем.
            </p>
          </section>

          <section
            v-if="form.variants.some((v) => v.kind === 'digital')"
            class="adm-panel"
            aria-labelledby="p-files"
          >
            <div class="adm-panel__head">
              <h2 id="p-files" class="adm-panel__title">Файлы по языкам</h2>
              <p class="adm-panel__hint">Покупатель получит файл на языке версии сайта (7.4)</p>
            </div>
            <p v-if="fileError" class="adm-note adm-danger">{{ fileError }}</p>
            <div
              v-for="v in form.variants.filter((x) => x.kind === 'digital')"
              :key="v.key"
              style="margin-bottom: 16px"
            >
              <p class="adm-legend-title">
                {{ v.labels.ru || v.labels.et || 'Цифровой вариант' }}
              </p>
              <p v-if="!v.id || !product" class="adm-note">
                Сохраните товар — после этого можно загрузить файлы.
              </p>
              <template v-else>
                <div v-for="l in fileLocales(v)" :key="l" class="adm-file" style="margin-top: 8px">
                  <span class="adm-file__ico">{{ l.toUpperCase() }}</span>
                  <div v-if="v.files[l]">
                    <a
                      class="adm-file__name"
                      :href="`/api/admin/products/${product.id}/files/${v.files[l]!.id}`"
                    >
                      {{ v.files[l]!.filename }}
                    </a>
                    <small>
                      {{ fileSize(v.files[l]!.size) }} · загружен
                      {{ new Date(v.files[l]!.uploadedAt).toLocaleDateString('ru-RU') }}
                      <template v-if="!form.locales.includes(l)">
                        · товар скрыт в этой версии</template
                      >
                    </small>
                  </div>
                  <div v-else>
                    <span class="adm-file__name">Файла нет</span>
                    <small
                      >Без него в {{ localeNames[l].where }} версии этот вариант не купить</small
                    >
                  </div>
                  <span v-if="fileProgress.has(`${v.key}-${l}`)" class="adm-note">
                    {{ fileProgress.get(`${v.key}-${l}`) }}%
                  </span>
                  <template v-else-if="canEdit">
                    <label class="btn btn--sm">
                      {{ v.files[l] ? 'Заменить' : 'Загрузить' }}
                      <input
                        type="file"
                        class="adm-vh"
                        :accept="
                          Object.keys(productFileTypes)
                            .map((e) => `.${e}`)
                            .join(',')
                        "
                        @change="uploadFile(v, l, ($event.target as HTMLInputElement).files?.[0])"
                      />
                    </label>
                    <button
                      v-if="v.files[l]"
                      class="adm-link-btn adm-danger"
                      type="button"
                      @click="removeFile(v, l)"
                    >
                      Удалить
                    </button>
                  </template>
                </div>
              </template>
            </div>
            <p class="adm-note">
              PDF, EPUB, MP3, M4A, ZIP, JPG, PNG, TIFF — до {{ MAX_PRODUCT_FILE_MB }} МБ. Файлы
              лежат в закрытой папке: покупатель получит ссылку после оплаты (этап 4).
            </p>
            <p class="adm-q" style="margin-top: 8px">
              Срок ссылки и число скачиваний — вопрос к заказчице (7.4)
            </p>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Продажа и где показывать">
          <section class="adm-panel" aria-labelledby="p-sale">
            <h2 id="p-sale" class="adm-panel__title" style="margin-bottom: 14px">Продажа</h2>
            <div class="form" style="grid-template-columns: 1fr">
              <div class="field">
                <label for="s-state">Состояние</label>
                <select id="s-state" v-model="form.state">
                  <option v-for="s in productStates" :key="s" :value="s">
                    {{ productStateNames[s] }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label for="s-cat">Категория</label>
                <select id="s-cat" v-model="form.categoryId">
                  <option v-for="c in categories" :key="c.id" :value="c.id">
                    {{ categoryName(c.id) }}{{ c.isVisible ? '' : ' (скрыта)' }}
                  </option>
                </select>
                <span v-if="issues.categoryId" class="adm-note adm-danger">
                  {{ issues.categoryId }}
                </span>
              </div>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-loc">
            <h2 id="p-loc" class="adm-panel__title" style="margin-bottom: 6px">Где показывать</h2>
            <p class="adm-note" style="margin-bottom: 14px">
              Выключенный язык — товара в этой версии сайта нет совсем: ни в каталоге, ни в поиске,
              ни в блоках на страницах. Перевода нет, а язык включён — покажем эстонский текст.
            </p>
            <div class="adm-switch-list">
              <label v-for="l in contentLocales" :key="l" class="adm-switch">
                <input
                  type="checkbox"
                  :checked="form.locales.includes(l)"
                  @change="toggleLocale(l, ($event.target as HTMLInputElement).checked)"
                />
                <span class="adm-switch__track" />{{ localeNames[l].version }}
              </label>
            </div>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
