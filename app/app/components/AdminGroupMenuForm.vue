<script setup lang="ts">
// Обед для групп («Трапезы групп», 7.1): номер, название и состав на трёх языках,
// цена с человека, «на сайте». Новый (menuId = null) или существующий.
import { menuItemLines, type AdminGroupMenus } from '#shared/group-menus'
import type { Localized } from '#shared/menu'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { formatPrice, parsePrice } from '#shared/money'

const props = defineProps<{
  data: AdminGroupMenus
  menuId: number | null
}>()

const { can } = useAdminUser()
const canEdit = computed(() => can('menu', 'edit'))
const base = '/admin/menu/group'

const menu = computed(() =>
  props.menuId === null ? null : (props.data.menus.find((m) => m.id === props.menuId) ?? null),
)

const name = (names: Localized<string>) =>
  pickTranslation(
    Object.entries(names).map(([locale, text]) => ({ locale, text: text ?? '' })),
    'ru',
  )?.text ?? ''

const texts = (key: 'names' | 'items') =>
  Object.fromEntries(contentLocales.map((l) => [l, menu.value?.[key][l] ?? ''])) as Record<
    ContentLocale,
    string
  >

const form = reactive({
  number: menu.value?.number ?? Math.max(0, ...props.data.menus.map((m) => m.number)) + 1,
  names: texts('names'),
  items: texts('items'),
  price: menu.value ? formatPrice(menu.value.priceCents).replace(' €', '') : '',
  isVisible: menu.value?.isVisible ?? true,
})
const lang = ref<ContentLocale>('ru')

const error = ref('')
const saving = ref(false)

/** Состав без перевода при названии на этом языке — на сайте будет пустая карточка */
const missingItems = computed(() =>
  contentLocales.filter((l) => form.names[l].trim() && !menuItemLines(form.items[l]).length),
)

async function save() {
  error.value = ''
  const priceCents = parsePrice(form.price)
  if (priceCents === null) {
    error.value = 'Цена с человека — число, например 16,00'
    return
  }
  const pick = (values: Record<ContentLocale, string>, clean: (v: string) => string) =>
    Object.fromEntries(
      contentLocales.filter((l) => clean(values[l])).map((l) => [l, clean(values[l])]),
    )
  const body = {
    number: form.number,
    priceCents,
    isVisible: form.isVisible,
    names: pick(form.names, (v) => v.trim()),
    items: pick(form.items, (v) => menuItemLines(v).join('\n')),
  }
  saving.value = true
  try {
    if (props.menuId === null) {
      await $fetch<unknown>('/api/admin/group-menus', { method: 'POST', body })
    } else {
      await $fetch<unknown>(`/api/admin/group-menus/${props.menuId}`, { method: 'PUT', body })
    }
    await navigateTo(base)
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (props.menuId === null) return
  const title = `Меню № ${form.number} «${name(form.names)}»`
  if (!confirm(`Удалить ${title}? Поступившие заявки не изменятся: в них снимок обеда и цены.`))
    return
  try {
    await $fetch<unknown>(`/api/admin/group-menus/${props.menuId}`, { method: 'DELETE' })
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
        <NuxtLink class="adm-back" :to="base">← Групповое меню</NuxtLink>
        <h1 class="adm-top__title">
          {{ menuId === null && !name(form.names) ? 'Новый обед' : `Меню № ${form.number}` }}
          <template v-if="name(form.names)">«{{ name(form.names) }}»</template>
        </h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" :to="base">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="menuId !== null && !menu" class="adm-alert" role="alert">Обед не найден.</p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть меню.</p>
    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

    <fieldset
      v-if="menuId === null || menu"
      :disabled="!canEdit"
      style="border: 0; padding: 0; margin: 0; min-width: 0"
    >
      <div class="adm-layout">
        <section class="adm-panel" aria-labelledby="p-text">
          <div class="adm-panel__head">
            <h2 id="p-text" class="adm-panel__title">Название и состав</h2>
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
          <div class="adm-stack" style="gap: 16px">
            <div class="field">
              <label for="g-name">Название ({{ lang.toUpperCase() }})</label>
              <input
                id="g-name"
                v-model="form.names[lang]"
                type="text"
                maxlength="100"
                placeholder="Таможенное"
              />
            </div>
            <div class="field">
              <label for="g-items">Состав ({{ lang.toUpperCase() }})</label>
              <textarea
                id="g-items"
                v-model="form.items[lang]"
                rows="6"
                maxlength="2000"
                aria-describedby="g-items-hint"
              />
              <span id="g-items-hint" class="adm-note">
                Каждое блюдо — с новой строки: на сайте это пункты списка в карточке
              </span>
            </div>
          </div>
          <p v-if="missingItems.length" class="adm-note adm-danger" style="margin-top: 10px">
            Нет состава на {{ missingItems.map((l) => l.toUpperCase()).join(', ') }} — карточка
            будет без списка блюд.
          </p>
        </section>

        <aside class="adm-stack" aria-label="Цена и публикация">
          <section class="adm-panel" aria-labelledby="p-pub">
            <h2 id="p-pub" class="adm-panel__title" style="margin-bottom: 14px">
              Цена и публикация
            </h2>
            <div class="adm-stack" style="gap: 16px">
              <div class="field">
                <label for="g-number">Номер меню</label>
                <input
                  id="g-number"
                  v-model.number="form.number"
                  type="number"
                  min="1"
                  max="999"
                  aria-describedby="g-number-hint"
                />
                <span id="g-number-hint" class="adm-note">
                  «Меню № 3» — по номеру обед называют по телефону; в этом порядке он и на сайте
                </span>
              </div>
              <div class="field">
                <label for="g-price">С человека, €</label>
                <input
                  id="g-price"
                  v-model="form.price"
                  type="text"
                  inputmode="decimal"
                  placeholder="16,00"
                />
              </div>
              <label class="adm-switch">
                <input v-model="form.isVisible" type="checkbox" aria-label="Показывать на сайте" />
                <span class="adm-switch__track" />
                {{ form.isVisible ? 'На сайте' : 'Скрыт' }}
              </label>
            </div>
            <p v-if="canEdit && menuId !== null" style="margin-top: 16px; text-align: center">
              <button class="adm-link-btn adm-danger" type="button" @click="remove">
                Удалить обед
              </button>
            </p>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
