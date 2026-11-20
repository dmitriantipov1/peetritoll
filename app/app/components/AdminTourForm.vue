<script setup lang="ts">
// Экскурсионная программа (20.11.2026): название, описание, длительность и условия на трёх
// языках; цена за группу или с человека, минимум человек, гид, языки, фото, «на сайте».
// Новая (tourId = null) или существующая. Список — pages/admin/tours/index.vue
import {
  tourLanguageNames,
  tourLanguages,
  tourPriceUnitNames,
  tourPriceUnits,
  tourTitleRu,
  type AdminTour,
  type TourLanguage,
  type TourPriceUnit,
} from '#shared/tours'
import type { MediaImage } from '#shared/media'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { formatPrice, parsePrice } from '#shared/money'

const props = defineProps<{
  tours: AdminTour[]
  tourId: number | null
}>()

const { can } = useAdminUser()
const canEdit = computed(() => can('tours', 'edit'))
const base = '/admin/tours'

const tour = computed(() =>
  props.tourId === null ? null : (props.tours.find((t) => t.id === props.tourId) ?? null),
)

type TextKey = 'titles' | 'texts' | 'durations' | 'terms'
const texts = (key: TextKey) =>
  Object.fromEntries(contentLocales.map((l) => [l, tour.value?.[key][l] ?? ''])) as Record<
    ContentLocale,
    string
  >

const form = reactive({
  titles: texts('titles'),
  texts: texts('texts'),
  durations: texts('durations'),
  terms: texts('terms'),
  price: tour.value ? formatPrice(tour.value.priceCents).replace(' €', '') : '',
  priceUnit: (tour.value?.priceUnit ?? 'group') as TourPriceUnit,
  minPeople: (tour.value?.minPeople ?? null) as number | null,
  guide: tour.value?.guide ?? '',
  languages: [...(tour.value?.languages ?? [])] as TourLanguage[],
  photo: (tour.value?.photo ?? null) as MediaImage | null,
  legacyPhoto: tour.value?.legacyPhoto ?? null,
  isVisible: tour.value?.isVisible ?? true,
})
const lang = ref<ContentLocale>('ru')

const error = ref('')
const saving = ref(false)

/** Описания нет при названии на этом языке — карточка будет без текста */
const missingText = computed(() =>
  contentLocales.filter((l) => form.titles[l].trim() && !form.texts[l].trim()),
)

async function save() {
  error.value = ''
  const priceCents = parsePrice(form.price)
  if (priceCents === null) {
    error.value = 'Цена — число, например 30 или 30,00'
    return
  }
  const pick = (values: Record<ContentLocale, string>) =>
    Object.fromEntries(contentLocales.filter((l) => values[l].trim()).map((l) => [l, values[l].trim()]))
  const body = {
    isVisible: form.isVisible,
    priceCents,
    priceUnit: form.priceUnit,
    minPeople: form.minPeople || null,
    guide: form.guide.trim(),
    // В порядке списка, а не в порядке нажатия
    languages: tourLanguages.filter((l) => form.languages.includes(l)),
    photoId: form.photo?.id ?? null,
    legacyPhoto: form.legacyPhoto,
    titles: pick(form.titles),
    texts: pick(form.texts),
    durations: pick(form.durations),
    terms: pick(form.terms),
  }
  saving.value = true
  try {
    if (props.tourId === null) {
      await $fetch<unknown>('/api/admin/tours', { method: 'POST', body })
    } else {
      await $fetch<unknown>(`/api/admin/tours/${props.tourId}`, { method: 'PUT', body })
    }
    await navigateTo(base)
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (props.tourId === null) return
  const title = `«${tourTitleRu(form.titles)}»`
  if (
    !confirm(
      `Удалить программу ${title}? Поступившие заявки не изменятся: в них название программы снимком.`,
    )
  )
    return
  try {
    await $fetch<unknown>(`/api/admin/tours/${props.tourId}`, { method: 'DELETE' })
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
        <NuxtLink class="adm-back" :to="base">← Экскурсии</NuxtLink>
        <h1 class="adm-top__title">{{ tourTitleRu(form.titles) || 'Новая программа' }}</h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" :to="base">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="tourId !== null && !tour" class="adm-alert" role="alert">Программа не найдена.</p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть программы.</p>
    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

    <fieldset
      v-if="tourId === null || tour"
      :disabled="!canEdit"
      style="border: 0; padding: 0; margin: 0; min-width: 0"
    >
      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-text">
            <div class="adm-panel__head">
              <h2 id="p-text" class="adm-panel__title">Тексты</h2>
              <p class="adm-panel__hint">Если перевода нет, на сайте покажем эстонский текст</p>
            </div>
            <div class="adm-lang-tabs" role="tablist" aria-label="Язык">
              <button
                v-for="l in contentLocales"
                :key="l"
                type="button"
                role="tab"
                :aria-selected="lang === l"
                :class="{ 'is-untranslated': !form.titles[l].trim() }"
                @click="lang = l"
              >
                {{ l.toUpperCase() }}
              </button>
            </div>
            <div class="adm-stack" style="gap: 16px">
              <div class="field">
                <label for="t-title">Название ({{ lang.toUpperCase() }})</label>
                <input
                  id="t-title"
                  v-model="form.titles[lang]"
                  type="text"
                  maxlength="150"
                  placeholder="Экспресс-экскурсия по выставке"
                />
              </div>
              <div class="field">
                <label for="t-text">Описание ({{ lang.toUpperCase() }})</label>
                <textarea id="t-text" v-model="form.texts[lang]" rows="5" maxlength="2000" />
              </div>
              <div class="field">
                <label for="t-duration">Длительность ({{ lang.toUpperCase() }})</label>
                <input
                  id="t-duration"
                  v-model="form.durations[lang]"
                  type="text"
                  maxlength="60"
                  placeholder="60 минут"
                />
              </div>
              <div class="field">
                <label for="t-terms">Условия ({{ lang.toUpperCase() }})</label>
                <input
                  id="t-terms"
                  v-model="form.terms[lang]"
                  type="text"
                  maxlength="200"
                  placeholder="по предварительному заказу"
                  aria-describedby="t-terms-hint"
                />
                <span id="t-terms-hint" class="adm-note">
                  В карточке — после цены: «60 минут · 50 € за группу · по предварительному заказу»
                </span>
              </div>
            </div>
            <p v-if="missingText.length" class="adm-note adm-danger" style="margin-top: 10px">
              Нет описания на {{ missingText.map((l) => l.toUpperCase()).join(', ') }} — карточка
              будет без текста.
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
              alt="Фото программы"
            />
          </section>
        </div>

        <aside class="adm-stack" aria-label="Цена, гид и публикация">
          <section class="adm-panel" aria-labelledby="p-price">
            <h2 id="p-price" class="adm-panel__title" style="margin-bottom: 14px">Цена</h2>
            <div class="adm-stack" style="gap: 16px">
              <div class="field">
                <label for="t-price">Цена, €</label>
                <input
                  id="t-price"
                  v-model="form.price"
                  type="text"
                  inputmode="decimal"
                  placeholder="30,00"
                />
              </div>
              <fieldset style="border: 0; padding: 0; margin: 0">
                <legend class="adm-legend-title">Цена указана</legend>
                <label
                  v-for="(u, i) in tourPriceUnits"
                  :key="u"
                  class="adm-check"
                  :style="{ marginTop: i ? '8px' : '0' }"
                >
                  <input v-model="form.priceUnit" type="radio" name="t-unit" :value="u" />
                  {{ tourPriceUnitNames[u] }}
                </label>
              </fieldset>
              <div class="field">
                <label for="t-min">Группа от, человек</label>
                <input
                  id="t-min"
                  v-model.number="form.minPeople"
                  type="number"
                  min="1"
                  max="1000"
                  aria-describedby="t-min-hint"
                />
                <span id="t-min-hint" class="adm-note">Пусто — без ограничения</span>
              </div>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-guide">
            <h2 id="p-guide" class="adm-panel__title" style="margin-bottom: 14px">Гид и языки</h2>
            <div class="adm-stack" style="gap: 16px">
              <div class="field">
                <label for="t-guide">Гид</label>
                <input
                  id="t-guide"
                  v-model="form.guide"
                  type="text"
                  maxlength="100"
                  placeholder="Елена Малютина"
                  aria-describedby="t-guide-hint"
                />
                <span id="t-guide-hint" class="adm-note">Пусто — строки «Гид» в карточке нет</span>
              </div>
              <fieldset style="border: 0; padding: 0; margin: 0">
                <legend class="adm-legend-title">Языки программы</legend>
                <label
                  v-for="(l, i) in tourLanguages"
                  :key="l"
                  class="adm-check"
                  :style="{ marginTop: i ? '8px' : '0' }"
                >
                  <input v-model="form.languages" type="checkbox" :value="l" />
                  {{ tourLanguageNames[l] }}
                </label>
              </fieldset>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-pub">
            <h2 id="p-pub" class="adm-panel__title" style="margin-bottom: 14px">Публикация</h2>
            <label class="adm-switch">
              <input v-model="form.isVisible" type="checkbox" aria-label="Показывать на сайте" />
              <span class="adm-switch__track" />
              {{ form.isVisible ? 'На сайте' : 'Скрыта' }}
            </label>
            <p v-if="canEdit && tourId !== null" style="margin-top: 16px; text-align: center">
              <button class="adm-link-btn adm-danger" type="button" @click="remove">
                Удалить программу
              </button>
            </p>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
