<script setup lang="ts">
// Карточка материала: новость, мероприятие или страница (5.7). Новая (material = null) или
// существующая. Разметка и классы — из прототипа (admin/material.html).
// Без права «правит» — те же поля, только для чтения.
import {
  eventKinds,
  eventPlaces,
  materialPath,
  materialStatusNames,
  materialTypeNames,
  newsTopics,
  type AdminMaterial,
  type EventKind,
  type EventPlace,
  type MaterialInput,
  type MaterialState,
  type MaterialType,
  type NewsTopic,
} from '#shared/materials'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { fullDate, todayInTallinn, toTallinnLocal } from '#shared/dates'
import { slugify } from '#shared/slug'
import type { MediaImage } from '#shared/media'

const props = defineProps<{
  material: AdminMaterial | null
  /** Тип новой записи (из кнопки «+ Новость / Страница / Мероприятие») */
  type?: MaterialType
  canEdit: boolean
}>()
const emit = defineEmits<{ saved: [material: AdminMaterial] }>()

const localeNames: Record<ContentLocale, { what: string; version: string }> = {
  et: { what: 'эстонский', version: 'Эстонская версия' },
  en: { what: 'английский', version: 'Английская версия' },
  ru: { what: 'русский', version: 'Русская версия' },
}

const states: { key: MaterialState; label: string; cls: string }[] = [
  { key: 'draft', label: 'Черновик', cls: 'is-cancel' },
  { key: 'published', label: 'На сайте', cls: 'is-done' },
  { key: 'archived', label: 'В архиве', cls: 'is-cancel' },
]

// ---------- Состояние формы ----------

function initialState() {
  const m = props.material
  const type = m?.type ?? props.type ?? 'news'
  return {
    type,
    state: m?.state ?? ('draft' as MaterialState),
    publishAt: m?.publishAt ?? '',
    locales: [...(m?.locales ?? [])] as ContentLocale[],
    topic: m?.topic ?? (null as NewsTopic | null),
    cover: m?.cover ?? (null as MediaImage | null),
    translations: Object.fromEntries(
      contentLocales.map((l) => {
        const t = m?.translations[l]
        return [
          l,
          {
            title: t?.title ?? '',
            slug: t?.slug ?? '',
            lead: t?.lead ?? '',
            body: t?.body ?? '',
            priceNote: t?.priceNote ?? '',
          },
        ]
      }),
    ) as Record<ContentLocale, MaterialInput['translations'][ContentLocale] & {}>,
    event:
      type === 'event'
        ? {
            kind: m?.event?.kind ?? null,
            date: m?.event?.date ?? todayInTallinn(),
            startTime: m?.event?.startTime ?? '18:00',
            place: m?.event?.place ?? null,
            registrationOpen: m?.event?.registrationOpen ?? true,
            capacity: m?.event?.capacity ?? null,
            archiveAfter: m?.event?.archiveAfter ?? true,
          }
        : null,
  }
}

const form = reactive(initialState())

// Админка на русском: открываем русский; если его нет — первый язык с заголовком
const lang = ref<ContentLocale>(
  !props.material || form.translations.ru.title
    ? 'ru'
    : (contentLocales.find((l) => form.translations[l].title) ?? 'ru'),
)
const t = computed(() => form.translations[lang.value])
const translated = (l: ContentLocale) => !!form.translations[l].title.trim()

// Адрес следует за заголовком, пока его не поправили руками
watch(
  () => contentLocales.map((l) => form.translations[l].title),
  (titles, old) => {
    contentLocales.forEach((l, i) => {
      const tr = form.translations[l]
      if (!tr.slug || tr.slug === slugify(old?.[i] ?? '')) tr.slug = slugify(titles[i] ?? '')
    })
  },
)

// Где показывать (8.5): у нового материала — на тех языках, где есть заголовок,
// пока переключатели не тронули. Забытый выключенным заметен, чужой язык в версии — нет
const localesTouched = ref(!!props.material)
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

// Тема новости, вид и место мероприятия: пустое значение в <select> — «не указано»
const topicModel = computed({
  get: () => form.topic ?? '',
  set: (v: string) => (form.topic = (v || null) as NewsTopic | null),
})
const kindModel = computed({
  get: () => form.event?.kind ?? '',
  set: (v: string) => form.event && (form.event.kind = (v || null) as EventKind | null),
})
const placeModel = computed({
  get: () => form.event?.place ?? '',
  set: (v: string) => form.event && (form.event.place = (v || null) as EventPlace | null),
})
const capacityModel = computed({
  get: () => form.event?.capacity ?? '',
  set: (v: number | string) =>
    form.event && (form.event.capacity = v === '' || v === null ? null : Number(v)),
})

// ---------- Сохранение ----------

const saving = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})

function toInput(): MaterialInput {
  return {
    type: form.type,
    state: form.state,
    publishAt: form.publishAt || null,
    locales: form.locales,
    topic: form.type === 'news' ? form.topic : null,
    coverId: form.cover?.id ?? null,
    // Язык без заголовка не сохраняем — на сайте для него покажем эстонский текст
    translations: Object.fromEntries(
      contentLocales.filter(translated).map((l) => {
        const tr = form.translations[l]
        return [l, { ...tr, title: tr.title.trim(), slug: tr.slug.trim() }]
      }),
    ),
    event: form.event ? { ...form.event, startTime: form.event.startTime || null } : null,
  }
}

async function save() {
  error.value = ''
  issues.value = {}
  saving.value = true
  try {
    if (props.material) {
      const saved = await $fetch<AdminMaterial>(`/api/admin/materials/${props.material.id}`, {
        method: 'PUT',
        body: toInput(),
      })
      emit('saved', saved)
    } else {
      const { id } = await $fetch<{ id: number }>('/api/admin/materials', {
        method: 'POST',
        body: toInput(),
      })
      await navigateTo(`/admin/materials/${id}`, { replace: true })
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

async function remove() {
  if (!props.material) return
  const what = materialTypeNames[form.type].one.toLowerCase()
  if (
    !confirm(
      `Удалить ${what} «${title.value}»? Вернуть будет нельзя — проще перенести в архив или в черновик.`,
    )
  )
    return
  try {
    await $fetch(`/api/admin/materials/${props.material.id}`, { method: 'DELETE' })
    await navigateTo('/admin/materials')
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось удалить. Попробуйте ещё раз.')
  }
}

// После сохранения форма берёт то, что вернул сервер (очищенный текст, собранные адреса)
watch(
  () => props.material,
  () => Object.assign(form, initialState()),
)

// ---------- Подписи ----------

const typeName = computed(() => materialTypeNames[form.type].one)
const newTitles: Record<MaterialType, string> = {
  news: 'Новая новость',
  event: 'Новое мероприятие',
  page: 'Новая страница',
}
const title = computed(
  () =>
    t.value.title.trim() ||
    contentLocales.map((l) => form.translations[l].title.trim()).find(Boolean) ||
    newTitles[form.type],
)

const meta = computed(() => {
  const m = props.material
  if (!m) return typeName.value
  const parts = [typeName.value, materialStatusNames[m.status].toLowerCase()]
  if (m.publishAt && m.state === 'published') parts[1] += ` ${fullDate(m.publishAt.slice(0, 10))}`
  const changed = new Date(m.updatedAt).toLocaleDateString('ru-RU')
  parts.push(`изменено ${changed}${m.updatedByName ? `, ${m.updatedByName}` : ''}`)
  return parts.join(' · ')
})

const publishHint = computed(() => {
  if (form.state !== 'published') return 'Пусто — выйдет сразу, как только переведёте «На сайте»'
  if (!form.publishAt) return 'Пусто — выйдет сразу после сохранения'
  return form.publishAt > toTallinnLocal(new Date()) ? 'Выйдет сам в это время' : 'Уже вышло'
})
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <NuxtLink class="adm-back" to="/admin/materials">← Новости и мероприятия</NuxtLink>
        <h1 class="adm-top__title">{{ title }}</h1>
        <p class="adm-top__meta">{{ meta }}</p>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" to="/admin/materials">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="!canEdit" class="adm-alert" role="note">
      У вас право только смотреть новости и мероприятия.
    </p>
    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

    <fieldset :disabled="!canEdit" style="border: 0; padding: 0; margin: 0; min-width: 0">
      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-text">
            <div class="adm-panel__head">
              <h2 id="p-text" class="adm-panel__title">Текст</h2>
              <p class="adm-panel__hint">У каждого языка свой текст и свой адрес</p>
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
                <label for="m-title">Заголовок ({{ localeNames[lang].what }})</label>
                <input id="m-title" v-model="t.title" type="text" maxlength="200" />
                <span v-if="issues.translations" class="adm-note adm-danger">
                  {{ issues.translations }}
                </span>
              </div>
              <div class="field">
                <label for="m-slug">Адрес страницы</label>
                <div class="adm-slug">
                  <span>peetritoll.ee{{ materialPath(form.type, lang) }}</span>
                  <input
                    id="m-slug"
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
                <span v-else class="adm-note">
                  Собирается из заголовка; латиница, цифры и дефисы
                </span>
              </div>
              <div v-if="form.type !== 'page'" class="field">
                <label for="m-lead">Коротко — для карточки в списке</label>
                <input id="m-lead" v-model="t.lead" type="text" maxlength="300" />
              </div>
              <div v-if="form.type === 'news'" class="field">
                <label for="m-topic">Тема — для фильтра на странице «Новости»</label>
                <select id="m-topic" v-model="topicModel">
                  <option value="">Без темы</option>
                  <option v-for="(names, key) in newsTopics" :key="key" :value="key">
                    {{ names.ru }}
                  </option>
                </select>
              </div>
              <div class="field">
                <span class="adm-legend-title">Текст страницы</span>
                <AdminRichText
                  :key="lang"
                  v-model="t.body"
                  :disabled="!canEdit"
                  :label="`Текст страницы (${localeNames[lang].what})`"
                />
              </div>
            </div>
          </section>

          <section v-if="form.event" class="adm-panel" aria-labelledby="p-event">
            <div class="adm-panel__head">
              <h2 id="p-event" class="adm-panel__title">Мероприятие</h2>
              <p class="adm-panel__hint">Эти поля есть только у мероприятий</p>
            </div>
            <div class="form">
              <div class="field">
                <label for="e-kind">Вид</label>
                <select id="e-kind" v-model="kindModel">
                  <option value="">Не указан</option>
                  <option v-for="(names, key) in eventKinds" :key="key" :value="key">
                    {{ names.ru }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label for="e-date">Дата</label>
                <input id="e-date" v-model="form.event.date" type="date" required />
              </div>
              <div class="field">
                <label for="e-time">Начало</label>
                <input id="e-time" v-model="form.event.startTime" type="time" />
              </div>
              <div class="field">
                <label for="e-place">Где</label>
                <select id="e-place" v-model="placeModel">
                  <option value="">Не указано</option>
                  <option v-for="(names, key) in eventPlaces" :key="key" :value="key">
                    {{ names.ru }}
                  </option>
                </select>
              </div>
              <div class="field form__wide">
                <label for="e-price">
                  Цена — для справки, оплата на месте ({{ lang.toUpperCase() }})
                </label>
                <input
                  id="e-price"
                  v-model="t.priceNote"
                  type="text"
                  maxlength="200"
                  placeholder="15 €, бокал глинтвейна включён"
                />
              </div>
            </div>
            <p class="adm-sub" style="margin-top: 22px">Запись</p>
            <div class="adm-switch-list">
              <label class="adm-switch">
                <input v-model="form.event.registrationOpen" type="checkbox" />
                <span class="adm-switch__track" />Принимать запись на сайте
              </label>
              <div v-if="form.event.registrationOpen" class="field">
                <label for="e-limit">Мест всего</label>
                <input
                  id="e-limit"
                  v-model="capacityModel"
                  type="number"
                  min="1"
                  placeholder="без ограничения"
                />
                <span v-if="issues['event.capacity']" class="adm-note adm-danger">
                  {{ issues['event.capacity'] }}
                </span>
              </div>
            </div>
            <p class="adm-note" style="margin-top: 12px">
              Список записавшихся появится здесь вместе с заявками.
            </p>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Публикация">
          <section class="adm-panel" aria-labelledby="p-pub">
            <h2 id="p-pub" class="adm-panel__title" style="margin-bottom: 14px">Публикация</h2>
            <div
              class="adm-seg"
              role="group"
              aria-labelledby="p-pub"
              style="grid-template-columns: repeat(3, minmax(0, 1fr))"
            >
              <button
                v-for="s in states"
                :key="s.key"
                :class="s.cls"
                type="button"
                :aria-pressed="form.state === s.key"
                @click="form.state = s.key"
              >
                {{ s.label }}
              </button>
            </div>
            <div class="field" style="margin-top: 16px">
              <label for="p-when">Опубликовать в</label>
              <input id="p-when" v-model="form.publishAt" type="datetime-local" />
              <span class="adm-note">{{ publishHint }}</span>
            </div>
            <label v-if="form.event" class="adm-check" style="margin-top: 12px">
              <input v-model="form.event.archiveAfter" type="checkbox" />
              После даты проведения перенести в архив
            </label>
            <div v-if="canEdit" class="adm-actions">
              <button class="btn btn--solid" type="submit" :disabled="saving">
                {{ saving ? 'Сохраняем…' : 'Сохранить' }}
              </button>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-loc">
            <h2 id="p-loc" class="adm-panel__title" style="margin-bottom: 6px">Где показывать</h2>
            <p class="adm-note" style="margin-bottom: 14px">
              Выключенный язык — материала в этой версии сайта нет совсем: ни в списке, ни в поиске.
              Перевода нет, а язык включён — покажем эстонский текст.
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

          <section class="adm-panel" aria-labelledby="p-cover">
            <h2 id="p-cover" class="adm-panel__title" style="margin-bottom: 14px">
              {{ form.type === 'event' ? 'Афиша' : 'Обложка' }}
            </h2>
            <AdminImageUpload
              v-model:image="form.cover"
              compact
              :disabled="!canEdit"
              :alt="form.type === 'event' ? 'Афиша' : 'Обложка'"
            />
            <p class="adm-note" style="margin-top: 10px">
              {{
                form.type === 'event'
                  ? 'Вертикальная, 3:4. Без своей — покажем афишу по умолчанию из настроек сайта'
                  : 'Для карточки в списке и вверху страницы'
              }}
            </p>
          </section>

          <section v-if="material && canEdit" class="adm-panel">
            <button class="adm-link-btn adm-danger" type="button" @click="remove">
              Удалить {{ typeName.toLowerCase() }}
            </button>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
