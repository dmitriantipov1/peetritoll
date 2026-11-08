<script setup lang="ts">
// Новости, мероприятия и страницы — список (5.7). Разметка — из прототипа (admin/materials.html).
// Языки в строке переключаются по клику (8.5): «где показывать», а не перевод.
import {
  materialStatusNames,
  materialStatuses,
  materialTypeNames,
  materialTypes,
  type AdminMaterialRow,
  type AdminMaterialsList,
  type MaterialStatus,
  type MaterialType,
} from '#shared/materials'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { fullDate } from '#shared/dates'

definePageMeta({ layout: 'admin', access: ['materials'] })
defineI18nRoute(false)
useHead({ title: 'Новости и мероприятия — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('materials', 'edit'))

const { data, error, refresh } = await useFetch<AdminMaterialsList>('/api/admin/materials', {
  deep: true,
})

// ---------- Фильтры ----------

const type = ref<MaterialType | 'all'>('all')
const status = ref<MaterialStatus | 'all'>('all')
const search = ref('')

const list = computed(() => data.value?.materials ?? [])
const count = (t: MaterialType | 'all') =>
  t === 'all' ? list.value.length : list.value.filter((m) => m.type === t).length

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return list.value.filter(
    (m) =>
      (type.value === 'all' || m.type === type.value) &&
      (status.value === 'all' || m.status === status.value) &&
      (!q || m.title.toLowerCase().includes(q) || m.slug.includes(q)),
  )
})

// ---------- Действия ----------

const actionError = ref('')

async function toggleLocale(m: AdminMaterialRow, l: ContentLocale) {
  if (!canEdit.value) return
  actionError.value = ''
  const before = m.locales
  m.locales = contentLocales.filter((x) => (x === l ? !before.includes(l) : before.includes(x)))
  try {
    await $fetch(`/api/admin/materials/${m.id}/locales`, {
      method: 'PATCH',
      body: { locales: m.locales },
    })
  } catch (e) {
    m.locales = before
    actionError.value = apiErrorMessage(e, 'Не удалось переключить язык. Попробуйте ещё раз.')
  }
}

async function toggleNews(enabled: boolean) {
  if (!data.value) return
  actionError.value = ''
  data.value.newsEnabled = enabled
  try {
    await $fetch('/api/admin/materials/news-section', { method: 'PUT', body: { enabled } })
  } catch (e) {
    actionError.value = apiErrorMessage(e, 'Не удалось переключить раздел.')
    await refresh()
  }
}

// ---------- Подписи ----------

const localeNames: Record<ContentLocale, string> = {
  et: 'эстонской',
  en: 'английской',
  ru: 'русской',
}

function langState(m: AdminMaterialRow, l: ContentLocale) {
  if (!m.locales.includes(l)) return { cls: 'adm-lang--off', text: 'скрыт в этой версии' }
  if (!m.translated.includes(l)) {
    return { cls: 'adm-lang--missing', text: 'виден, нет перевода — покажем эстонский текст' }
  }
  return { cls: 'adm-lang--ok', text: 'виден, переведён' }
}

const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
function dateCell(m: AdminMaterialRow): { main: string; sub?: string } {
  if (m.event) {
    const day = weekdays[new Date(`${m.event.date}T12:00:00Z`).getUTCDay()]
    return { main: `${day}, ${fullDate(m.event.date)}`, sub: m.event.startTime ?? undefined }
  }
  if (m.type !== 'page' && m.publishAt && m.status !== 'draft') {
    const date = new Date(m.publishAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Tallinn' })
    return { main: `${m.status === 'planned' ? 'выйдет' : 'опубл.'} ${date}` }
  }
  return { main: `изменено ${new Date(m.updatedAt).toLocaleDateString('ru-RU')}` }
}

const statusClass: Record<MaterialStatus, string> = {
  published: 'adm-status--done',
  planned: 'adm-status--planned',
  draft: 'adm-status--draft',
  archived: 'adm-status--archive',
}

function plannedAt(m: AdminMaterialRow) {
  if (m.status !== 'planned' || !m.publishAt) return ''
  return new Date(m.publishAt).toLocaleString('ru-RU', {
    timeZone: 'Europe/Tallinn',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Иконки типов — из прототипа
const typeIcons: Record<MaterialType, string> = {
  event: '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5"/>',
  page: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Содержимое</p>
        <h1 class="adm-top__title">Новости и мероприятия</h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" to="/admin/materials/new?type=news">
          <svg class="adm-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" /></svg
          >Новость
        </NuxtLink>
        <NuxtLink class="btn btn--sm" to="/admin/materials/new?type=page">
          <svg class="adm-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" /></svg
          >Страница
        </NuxtLink>
        <NuxtLink class="btn btn--solid btn--sm" to="/admin/materials/new?type=event">
          <svg class="adm-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" /></svg
          >Мероприятие
        </NuxtLink>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить список.') }}
    </p>
    <p v-if="actionError" class="adm-alert" role="alert">{{ actionError }}</p>

    <template v-if="data">
      <div class="adm-filters">
        <ul class="chips" aria-label="Тип">
          <li v-for="t in ['all', ...materialTypes] as const" :key="t">
            <button
              class="chip"
              :class="{ 'is-active': type === t }"
              type="button"
              :aria-pressed="type === t"
              @click="type = t"
            >
              {{ t === 'all' ? 'Все' : materialTypeNames[t].many
              }}<span class="chip__count">{{ count(t) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="adm-toolbar">
        <label class="adm-search">
          <span class="adm-vh">Поиск по заголовку</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Заголовок" />
        </label>
        <label class="adm-vh" for="mt-state">Состояние</label>
        <select id="mt-state" v-model="status" class="adm-select">
          <option value="all">Любое состояние</option>
          <option v-for="s in materialStatuses" :key="s" :value="s">
            {{ materialStatusNames[s] }}
          </option>
        </select>
        <label class="adm-switch">
          <input
            type="checkbox"
            :checked="data.newsEnabled"
            :disabled="!canEdit"
            @change="toggleNews(($event.target as HTMLInputElement).checked)"
          />
          <span class="adm-switch__track" />Раздел «Новости» на сайте
        </label>
      </div>

      <div class="adm-legend" aria-label="Обозначения языков">
        <span><span class="adm-lang adm-lang--ok">RU</span> виден и переведён</span>
        <span>
          <span class="adm-lang adm-lang--missing">EN</span> виден, но перевода нет — покажем
          эстонский текст
        </span>
        <span><span class="adm-lang adm-lang--off">EN</span> скрыт в этой версии сайта</span>
        <span v-if="canEdit" class="adm-note">Клик по языку — показать или скрыть</span>
      </div>

      <p v-if="!list.length" class="adm-note">
        Пока пусто. Начните с кнопки «Мероприятие» или «Новость» вверху.
      </p>
      <p v-else-if="!shown.length" class="adm-note">Ничего не нашлось — смените фильтр.</p>

      <div v-else class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th scope="col">Тип</th>
              <th scope="col">Заголовок</th>
              <th scope="col" class="is-sorted">Дата ↓</th>
              <th scope="col">Языки</th>
              <th scope="col">Состояние</th>
              <th scope="col"><span class="adm-vh">Изменить</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in shown"
              :key="m.id"
              :class="{ 'adm-row--hidden': m.status === 'archived' }"
            >
              <td>
                <span class="adm-type-ico">
                  <!-- eslint-disable-next-line vue/no-v-html -- свои иконки из кода -->
                  <svg viewBox="0 0 24 24" aria-hidden="true" v-html="typeIcons[m.type]" />
                  {{ materialTypeNames[m.type].one }}
                </span>
              </td>
              <td>
                <NuxtLink class="adm-dish__name" :to="`/admin/materials/${m.id}`">
                  {{ m.title }}
                </NuxtLink>
                <small>/{{ m.slug }}</small>
              </td>
              <td class="nowrap">
                {{ dateCell(m).main }}<small v-if="dateCell(m).sub">{{ dateCell(m).sub }}</small>
              </td>
              <td>
                <span class="adm-langs">
                  <component
                    :is="canEdit ? 'button' : 'span'"
                    v-for="l in contentLocales"
                    :key="l"
                    :type="canEdit ? 'button' : undefined"
                    class="adm-lang"
                    :class="langState(m, l).cls"
                    :title="`${l.toUpperCase()}: ${langState(m, l).text}`"
                    :aria-label="
                      canEdit
                        ? `${m.title}: ${m.locales.includes(l) ? 'скрыть' : 'показать'} в ${localeNames[l]} версии`
                        : undefined
                    "
                    @click="toggleLocale(m, l)"
                  >
                    {{ l.toUpperCase() }}
                  </component>
                </span>
              </td>
              <td>
                <span class="adm-status" :class="statusClass[m.status]">
                  {{ materialStatusNames[m.status]
                  }}<small v-if="plannedAt(m)">{{ plannedAt(m) }}</small>
                </span>
              </td>
              <td>
                <NuxtLink
                  class="adm-open"
                  :to="`/admin/materials/${m.id}`"
                  :aria-label="`Изменить: ${m.title}`"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
