<script setup lang="ts">
// Карточка блюда: новое (dish = null) или существующее. Разметка и классы — из прототипа
// (admin/dish.html). Без права «правит» — те же поля, но только для чтения.
import type { AdminDishDetails, AdminMenu, DishInput, Localized } from '#shared/menu'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { formatPrice, parsePrice } from '#shared/money'

const props = defineProps<{
  dish: AdminDishDetails | null
  menu: AdminMenu
  canEdit: boolean
  /** Категория для нового блюда (из ссылки «+ Блюдо в категорию») */
  categoryId?: number
}>()

const emit = defineEmits<{ saved: [dish: AdminDishDetails] }>()

const localeNames: Record<ContentLocale, string> = {
  et: 'Эстонский',
  en: 'Английский',
  ru: 'Русский',
}

// ---------- Состояние формы ----------

function initialState() {
  const d = props.dish
  return {
    categoryId: d?.categoryId ?? props.categoryId ?? props.menu.categories[0]?.id ?? 0,
    photo: d?.photo ?? null,
    legacyPhoto: d?.legacyPhoto ?? null,
    isVisible: d?.isVisible ?? true,
    translations: Object.fromEntries(
      contentLocales.map((l) => [
        l,
        {
          name: d?.translations[l]?.name ?? '',
          description: d?.translations[l]?.description ?? '',
        },
      ]),
    ) as Record<ContentLocale, { name: string; description: string }>,
    portions: (d?.portions.length
      ? d.portions
      : [{ priceCents: null, labels: {} as Localized<string> }]
    ).map((p) => ({
      price: p.priceCents === null ? '' : formatPrice(p.priceCents).replace(' €', ''),
      labels: Object.fromEntries(contentLocales.map((l) => [l, p.labels[l] ?? ''])) as Record<
        ContentLocale,
        string
      >,
    })),
    dietTagIds: [...(d?.dietTagIds ?? [])],
    labelIds: [...(d?.labelIds ?? [])],
  }
}

const form = reactive(initialState())

// Админка на русском: открываем русский, если перевода нет — первый, где есть название
const lang = ref<ContentLocale>(
  form.translations.ru.name || !props.dish
    ? 'ru'
    : (contentLocales.find((l) => form.translations[l].name) ?? 'ru'),
)
const translated = (l: ContentLocale) => !!form.translations[l].name.trim()

function localized(values: Partial<Record<string, string>>) {
  const rows = Object.entries(values).map(([locale, text]) => ({ locale, text: text ?? '' }))
  return pickTranslation(rows, 'ru')?.text ?? ''
}

function addPortion() {
  form.portions.push({
    price: '',
    labels: Object.fromEntries(contentLocales.map((l) => [l, ''])) as Record<ContentLocale, string>,
  })
}

// ---------- Сохранение ----------

const saving = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})

function toInput(): DishInput | null {
  const prices = form.portions.map((p) => parsePrice(p.price))
  if (prices.some((p) => p === null)) {
    issues.value = { portions: 'Цена — число, например 5,60' }
    return null
  }
  return {
    categoryId: form.categoryId,
    photoId: form.photo?.id ?? null,
    legacyPhoto: form.legacyPhoto,
    isVisible: form.isVisible,
    // Язык без названия не сохраняем — на сайте для него покажем эстонский
    translations: Object.fromEntries(
      contentLocales
        .filter((l) => form.translations[l].name.trim())
        .map((l) => [
          l,
          {
            name: form.translations[l].name.trim(),
            description: form.translations[l].description.trim() || null,
          },
        ]),
    ),
    portions: form.portions.map((p, i) => ({
      priceCents: prices[i]!,
      labels: Object.fromEntries(
        contentLocales.filter((l) => p.labels[l].trim()).map((l) => [l, p.labels[l].trim()]),
      ),
    })),
    dietTagIds: form.dietTagIds,
    labelIds: form.labelIds,
  }
}

async function save() {
  error.value = ''
  issues.value = {}
  const input = toInput()
  if (!input) {
    error.value = 'Проверьте цены.'
    return
  }
  saving.value = true
  try {
    if (props.dish) {
      const saved = await $fetch<AdminDishDetails>(`/api/admin/menu/dishes/${props.dish.id}`, {
        method: 'PUT',
        body: input,
      })
      emit('saved', saved)
    } else {
      const { id } = await $fetch<{ id: number }>('/api/admin/menu/dishes', {
        method: 'POST',
        body: input,
      })
      await navigateTo(`/admin/menu/${id}`, { replace: true })
    }
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    issues.value = apiErrorIssues(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.dish) return
  const name = form.translations[lang.value].name || 'блюдо'
  if (!confirm(`Удалить «${name}»? Вернуть его будет нельзя — проще скрыть с сайта.`)) return
  try {
    await $fetch(`/api/admin/menu/dishes/${props.dish.id}`, { method: 'DELETE' })
    await navigateTo('/admin/menu')
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось удалить. Попробуйте ещё раз.')
  }
}

// После сохранения форма берёт то, что вернул сервер (порядок, обрезанные пробелы)
watch(
  () => props.dish,
  () => Object.assign(form, initialState()),
)

// Заголовок: название на открытом языке, нет его — на другом, для нового блюда — «Новое блюдо»
const title = computed(() => {
  const names = Object.fromEntries(
    contentLocales.flatMap((l) => {
      const name = form.translations[l].name.trim()
      return name ? [[l, name]] : []
    }),
  )
  return names[lang.value] || localized(names) || 'Новое блюдо'
})

const categoryName = computed(() =>
  localized(props.menu.categories.find((c) => c.id === form.categoryId)?.names ?? {}),
)

const updatedText = computed(() => {
  if (!props.dish) return 'Новое блюдо'
  const date = new Date(props.dish.updatedAt).toLocaleDateString('ru-RU')
  return `Основное меню · изменено ${date}${props.dish.updatedByName ? `, ${props.dish.updatedByName}` : ''}`
})
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <NuxtLink class="adm-back" to="/admin/menu">← Меню · {{ categoryName }}</NuxtLink>
        <h1 class="adm-top__title">{{ title }}</h1>
        <p class="adm-top__meta">{{ updatedText }}</p>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" to="/admin/menu">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть меню.</p>
    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

    <fieldset :disabled="!canEdit" style="border: 0; padding: 0; margin: 0; min-width: 0">
      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-text">
            <div class="adm-panel__head">
              <h2 id="p-text" class="adm-panel__title">Название и описание</h2>
              <p class="adm-panel__hint">Если перевода нет, на сайте покажем эстонский текст</p>
            </div>
            <div class="adm-lang-tabs" role="tablist" aria-label="Язык">
              <button
                v-for="l in contentLocales"
                :key="l"
                type="button"
                role="tab"
                :aria-selected="lang === l"
                :class="{ 'is-untranslated': !translated(l) }"
                @click="lang = l"
              >
                {{ l.toUpperCase() }}
              </button>
            </div>
            <div class="form" style="grid-template-columns: 1fr">
              <div class="field">
                <label for="d-name">Название ({{ localeNames[lang].toLowerCase() }})</label>
                <input
                  id="d-name"
                  v-model="form.translations[lang].name"
                  type="text"
                  maxlength="200"
                />
              </div>
              <div class="field">
                <label for="d-desc">Описание</label>
                <textarea
                  id="d-desc"
                  v-model="form.translations[lang].description"
                  maxlength="1000"
                />
              </div>
            </div>
            <p v-if="issues.translations" class="adm-note adm-danger">{{ issues.translations }}</p>
          </section>

          <section class="adm-panel" aria-labelledby="p-price">
            <div class="adm-panel__head">
              <h2 id="p-price" class="adm-panel__title">Цена и порции</h2>
              <p class="adm-panel__hint">Одна цена или несколько вариантов, как у супов</p>
            </div>
            <div class="adm-variants">
              <div v-for="(portion, i) in form.portions" :key="i" class="adm-variants__row">
                <div class="field">
                  <label :for="`v${i}-name`">
                    Вариант ({{ lang.toUpperCase() }}){{
                      form.portions.length === 1 ? ' — можно пусто' : ''
                    }}
                  </label>
                  <input
                    :id="`v${i}-name`"
                    v-model="portion.labels[lang]"
                    type="text"
                    maxlength="100"
                    placeholder="Например, «Маленькая порция»"
                  />
                </div>
                <div class="field">
                  <label :for="`v${i}-price`">Цена, €</label>
                  <input
                    :id="`v${i}-price`"
                    v-model="portion.price"
                    type="text"
                    inputmode="decimal"
                    placeholder="5,60"
                  />
                </div>
                <button
                  v-if="form.portions.length > 1"
                  class="adm-icon-btn"
                  type="button"
                  aria-label="Удалить вариант"
                  @click="form.portions.splice(i, 1)"
                >
                  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            </div>
            <p v-if="issues.portions" class="adm-note adm-danger">{{ issues.portions }}</p>
            <p style="margin-top: 14px">
              <button class="adm-link-btn" type="button" @click="addPortion">
                + Добавить вариант (например, «маленький / большой»)
              </button>
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-photo">
            <div class="adm-panel__head">
              <h2 id="p-photo" class="adm-panel__title">Фото</h2>
              <p class="adm-panel__hint">JPG, PNG или WebP, лучше от 1200 px по длинной стороне</p>
            </div>
            <AdminImageUpload
              v-model:image="form.photo"
              v-model:legacy="form.legacyPhoto"
              :disabled="!canEdit"
              alt="Фото блюда"
            />
          </section>
        </div>

        <aside class="adm-stack" aria-label="Публикация">
          <section class="adm-panel" aria-labelledby="p-pub">
            <h2 id="p-pub" class="adm-panel__title" style="margin-bottom: 14px">Публикация</h2>
            <div class="adm-stack" style="gap: 16px">
              <label class="adm-switch">
                <input v-model="form.isVisible" type="checkbox" aria-label="Показывать на сайте" />
                <span class="adm-switch__track" />
                {{ form.isVisible ? 'На сайте' : 'Скрыто' }}
              </label>
              <div class="field">
                <label for="d-cat">Категория</label>
                <select id="d-cat" v-model="form.categoryId">
                  <option v-for="c in menu.categories" :key="c.id" :value="c.id">
                    {{ localized(c.names) }}
                  </option>
                </select>
              </div>
              <fieldset style="border: 0; padding: 0; margin: 0">
                <legend class="adm-legend-title">Отметки</legend>
                <label
                  v-for="(label, i) in menu.labels"
                  :key="label.id"
                  class="adm-check"
                  :style="{ marginTop: i ? '8px' : '0' }"
                >
                  <input v-model="form.labelIds" type="checkbox" :value="label.id" />
                  {{ localized(label.names) }}
                </label>
              </fieldset>
              <fieldset style="border: 0; padding: 0; margin: 0">
                <legend class="adm-legend-title">Отметки для гостей</legend>
                <label
                  v-for="(tag, i) in menu.dietTags"
                  :key="tag.id"
                  class="adm-check"
                  :style="{ marginTop: i ? '8px' : '0' }"
                >
                  <input v-model="form.dietTagIds" type="checkbox" :value="tag.id" />
                  {{ localized(tag.names) }}
                </label>
                <span class="adm-note" style="display: block; margin-top: 8px">
                  Видны на карточке блюда, по ним гости фильтруют меню. Список —
                  <NuxtLink to="/admin/menu/setup#marks">«Категории и отметки»</NuxtLink>
                </span>
              </fieldset>
            </div>
            <div v-if="canEdit" class="adm-actions">
              <button class="btn btn--solid" type="submit" :disabled="saving">
                {{ saving ? 'Сохраняем…' : 'Сохранить' }}
              </button>
            </div>
            <p v-if="canEdit && dish" style="margin-top: 16px; text-align: center">
              <button class="adm-link-btn adm-danger" type="button" @click="remove">
                Удалить блюдо
              </button>
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-trans">
            <h2 id="p-trans" class="adm-panel__title" style="margin-bottom: 14px">Переводы</h2>
            <dl class="adm-facts">
              <div v-for="l in contentLocales" :key="l">
                <dt>{{ localeNames[l] }}</dt>
                <dd v-if="translated(l)">Готов · {{ form.translations[l].name }}</dd>
                <dd v-else class="adm-danger">
                  {{
                    l === 'et'
                      ? 'Нет — на сайте покажем другой язык'
                      : 'Нет перевода — на сайте покажем эстонский'
                  }}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
