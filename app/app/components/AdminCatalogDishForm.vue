<script setup lang="ts">
// Блюдо банкетного меню: название на трёх языках, цена за порцию,
// категория, «можно заказать». Новое (dishId = null) или существующее.
import { catalogTitles, type AdminCatalog, type CatalogKind } from '#shared/catalog'
import type { Localized } from '#shared/menu'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { formatPrice, parsePrice } from '#shared/money'

const props = defineProps<{
  kind: CatalogKind
  catalog: AdminCatalog
  dishId: number | null
  /** Категория для нового блюда (из ссылки «+ Блюдо в категорию») */
  categoryId?: number
}>()

const { can } = useAdminUser()
const canEdit = computed(() => can('menu', 'edit'))
const base = `/admin/menu/${props.kind}`

const dish = computed(() =>
  props.dishId === null
    ? null
    : (props.catalog.categories.flatMap((c) => c.dishes).find((d) => d.id === props.dishId) ??
      null),
)

const name = (names: Localized<string>) =>
  pickTranslation(
    Object.entries(names).map(([locale, text]) => ({ locale, text: text ?? '' })),
    'ru',
  )?.text ?? ''

const form = reactive({
  names: Object.fromEntries(contentLocales.map((l) => [l, dish.value?.names[l] ?? ''])) as Record<
    ContentLocale,
    string
  >,
  price: dish.value ? formatPrice(dish.value.priceCents).replace(' €', '') : '',
  categoryId: dish.value?.categoryId ?? props.categoryId ?? props.catalog.categories[0]?.id ?? 0,
  isAvailable: dish.value?.isAvailable ?? true,
})
const lang = ref<ContentLocale>('ru')

const error = ref('')
const saving = ref(false)

async function save() {
  error.value = ''
  const priceCents = parsePrice(form.price)
  if (priceCents === null) {
    error.value = 'Цена за порцию — число, например 6,50'
    return
  }
  const body = {
    categoryId: form.categoryId,
    priceCents,
    isAvailable: form.isAvailable,
    names: Object.fromEntries(
      contentLocales.filter((l) => form.names[l].trim()).map((l) => [l, form.names[l].trim()]),
    ),
  }
  saving.value = true
  try {
    if (props.dishId === null) {
      await $fetch<unknown>(`/api/admin/catalog/${props.kind}/dishes`, { method: 'POST', body })
    } else {
      await $fetch<unknown>(`/api/admin/catalog/dishes/${props.dishId}`, { method: 'PUT', body })
    }
    await navigateTo(base)
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (props.dishId === null) return
  if (!confirm(`Удалить «${name(form.names)}»? Поступившие заявки не изменятся: в них снимок цен.`))
    return
  try {
    await $fetch<unknown>(`/api/admin/catalog/dishes/${props.dishId}`, { method: 'DELETE' })
    await navigateTo(base)
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось удалить. Попробуйте ещё раз.')
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <NuxtLink class="adm-back" :to="base">← {{ catalogTitles[kind] }} меню</NuxtLink>
        <h1 class="adm-top__title">{{ name(form.names) || 'Новое блюдо' }}</h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" :to="base">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="dishId !== null && !dish" class="adm-alert" role="alert">Блюдо не найдено.</p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть меню.</p>
    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

    <fieldset
      v-if="dishId === null || dish"
      :disabled="!canEdit"
      style="border: 0; padding: 0; margin: 0; min-width: 0"
    >
      <div class="adm-layout">
        <section class="adm-panel" aria-labelledby="p-text">
          <div class="adm-panel__head">
            <h2 id="p-text" class="adm-panel__title">Название и цена</h2>
            <p class="adm-panel__hint">Если перевода нет, на сайте покажем эстонский текст</p>
          </div>
          <div class="adm-lang-tabs" role="tablist" aria-label="Язык">
            <button
              v-for="l in contentLocales"
              :key="l"
              type="button"
              role="tab"
              :aria-selected="lang === l"
              :class="{ 'is-untranslated': !form.names[l].trim() }"
              @click="lang = l"
            >
              {{ l.toUpperCase() }}
            </button>
          </div>
          <div class="form" style="grid-template-columns: 1fr 160px">
            <div class="field">
              <label for="c-name">Название ({{ lang.toUpperCase() }})</label>
              <input id="c-name" v-model="form.names[lang]" type="text" maxlength="200" />
            </div>
            <div class="field">
              <label for="c-price">За порцию, €</label>
              <input
                id="c-price"
                v-model="form.price"
                type="text"
                inputmode="decimal"
                placeholder="6,50"
              />
            </div>
          </div>
          <p v-if="dish?.previousPriceCents != null" class="adm-note" style="margin-top: 10px">
            Прежняя цена — {{ formatPrice(dish.previousPriceCents) }}. Поступившие заявки считаются
            по ценам на момент отправки.
          </p>
        </section>

        <aside class="adm-stack" aria-label="Публикация">
          <section class="adm-panel" aria-labelledby="p-pub">
            <h2 id="p-pub" class="adm-panel__title" style="margin-bottom: 14px">Публикация</h2>
            <div class="adm-stack" style="gap: 16px">
              <label class="adm-switch">
                <input v-model="form.isAvailable" type="checkbox" aria-label="Можно заказать" />
                <span class="adm-switch__track" />
                {{ form.isAvailable ? 'Можно заказать' : 'Нельзя заказать' }}
              </label>
              <div class="field">
                <label for="c-cat">Категория</label>
                <select id="c-cat" v-model="form.categoryId">
                  <option v-for="c in catalog.categories" :key="c.id" :value="c.id">
                    {{ name(c.names) }}
                  </option>
                </select>
              </div>
            </div>
            <p v-if="canEdit && dishId !== null" style="margin-top: 16px; text-align: center">
              <button class="adm-link-btn adm-danger" type="button" @click="remove">
                Удалить блюдо
              </button>
            </p>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
