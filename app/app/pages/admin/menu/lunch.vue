<script setup lang="ts">
// Дневное меню (7.1): неделя по будним дням и настройки. Разметка — из прототипа (admin/menu-lunch.html).
// Блюда — текстом на трёх языках, с основным меню не связаны. Колонки «Предзаказы» пока нет:
// предзаказы появятся в срезе «Заявки».
import type { AdminLunchWeek, LunchSettings } from '#shared/lunch'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { addDays, shortDate } from '#shared/dates'
import { formatPrice, parsePrice } from '#shared/money'

definePageMeta({ layout: 'admin', access: ['menu.lunch'] })
defineI18nRoute(false)
useHead({ title: 'Дневное меню — админка Peetri Toll' })

const route = useRoute()
const { can } = useAdminUser()
const canEdit = computed(() => can('menu.lunch', 'edit'))

const week = computed(() => (typeof route.query.week === 'string' ? route.query.week : ''))
const { data, error } = await useFetch<AdminLunchWeek>('/api/admin/menu/lunch', {
  query: { week },
})

const weekdayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']
const monthNames = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

/** «9–13 ноября», «30 ноября — 4 декабря» */
function weekTitle(monday: string) {
  const friday = addDays(monday, 4)
  const day = (d: string) => Number(d.slice(8, 10))
  const month = (d: string) => monthNames[Number(d.slice(5, 7)) - 1]
  return month(monday) === month(friday)
    ? `${day(monday)}–${day(friday)} ${month(friday)}`
    : `${day(monday)} ${month(monday)} — ${day(friday)} ${month(friday)}`
}

// ---------- Форма недели ----------

const lang = ref<ContentLocale>('ru')
const priceText = (cents: number | null) =>
  cents === null ? '' : formatPrice(cents).replace(' €', '')

function weekState(w: AdminLunchWeek) {
  return weekdayNames.map((name, i) => {
    const date = addDays(w.monday, i)
    const d = w.days.find((x) => x.date === date)
    return {
      date,
      name,
      texts: Object.fromEntries(
        contentLocales.map((l) => [
          l,
          { soup: d?.translations[l]?.soup ?? '', main: d?.translations[l]?.main ?? '' },
        ]),
      ) as Record<ContentLocale, { soup: string; main: string }>,
      soup: priceText(d?.soupCents ?? null),
      main: priceText(d?.mainCents ?? null),
      full: priceText(d?.fullCents ?? null),
    }
  })
}

const days = ref(data.value ? weekState(data.value) : [])
const saved = ref(JSON.stringify(days.value))
const dirty = computed(() => JSON.stringify(days.value) !== saved.value)

watch(data, (w) => {
  if (!w) return
  days.value = weekState(w)
  saved.value = JSON.stringify(days.value)
})

/** Есть дни с блюдами, где на этом языке не написано ничего */
function untranslated(l: ContentLocale) {
  return days.value.some(
    (d) =>
      contentLocales.some((x) => d.texts[x].soup || d.texts[x].main) &&
      !d.texts[l].soup &&
      !d.texts[l].main,
  )
}

function status(date: string) {
  const today = data.value?.today ?? ''
  if (date < today) return 'past'
  if (date === today) return 'today'
  return 'future'
}

const message = ref('')
const saveError = ref('')
const saving = ref(false)

function toInput() {
  const bad: string[] = []
  const price = (text: string, label: string) => {
    if (!text.trim()) return null
    const cents = parsePrice(text)
    if (cents === null) bad.push(label)
    return cents
  }
  const result = days.value.map((d) => ({
    date: d.date,
    translations: Object.fromEntries(
      contentLocales.map((l) => [
        l,
        { soup: d.texts[l].soup.trim() || null, main: d.texts[l].main.trim() || null },
      ]),
    ),
    soupCents: price(d.soup, `${d.name}: суп`),
    mainCents: price(d.main, `${d.name}: горячее`),
    fullCents: price(d.full, `${d.name}: обед целиком`),
  }))
  if (bad.length) {
    saveError.value = `Цена — число, например 4,50. Проверьте: ${bad.join(', ')}`
    return null
  }
  return result
}

async function saveWeek() {
  if (!data.value) return
  message.value = ''
  saveError.value = ''
  const input = toInput()
  if (!input) return
  saving.value = true
  try {
    data.value = await $fetch<AdminLunchWeek>('/api/admin/menu/lunch/week', {
      method: 'PUT',
      body: { monday: data.value.monday, days: input },
    })
    message.value = 'Неделя сохранена.'
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

async function copyPrevious() {
  if (!data.value) return
  if (dirty.value && !confirm('Несохранённые правки этой недели пропадут. Продолжить?')) return
  message.value = ''
  saveError.value = ''
  try {
    const result = await $fetch<{ copied: number; week: AdminLunchWeek }>(
      '/api/admin/menu/lunch/copy-previous',
      { method: 'POST', body: { monday: data.value.monday } },
    )
    data.value = result.week
    message.value = result.copied
      ? `Скопировано дней: ${result.copied}. Заполненные дни не трогали.`
      : 'Копировать нечего: прошлая неделя пустая или эта уже заполнена.'
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось скопировать. Попробуйте ещё раз.')
  }
}

function goWeek(shift: number) {
  if (!data.value) return
  if (dirty.value && !confirm('Несохранённые правки этой недели пропадут. Перейти?')) return
  message.value = ''
  saveError.value = ''
  navigateTo({ query: { week: addDays(data.value.monday, shift * 7) } })
}

// ---------- Настройки ----------

const settings = ref<LunchSettings | null>(data.value ? structuredClone(data.value.settings) : null)
watch(data, (w) => {
  if (w) settings.value = structuredClone(w.settings)
})
const settingsMessage = ref('')
const settingsError = ref('')

async function saveSettings() {
  if (!settings.value) return
  settingsMessage.value = ''
  settingsError.value = ''
  try {
    settings.value = await $fetch<LunchSettings>('/api/admin/menu/lunch/settings', {
      method: 'PUT',
      body: settings.value,
    })
    settingsMessage.value = 'Настройки сохранены.'
  } catch (e) {
    settingsError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  }
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Содержимое</p>
        <h1 class="adm-top__title">Меню</h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <button class="btn btn--sm" type="button" @click="copyPrevious">
          Скопировать прошлую неделю
        </button>
        <button
          class="btn btn--solid btn--sm"
          type="button"
          :disabled="saving || !dirty"
          @click="saveWeek"
        >
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <AdminMenuTabs current="lunch" />

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить дневное меню.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть дневное меню.</p>
    <p v-if="saveError" class="adm-alert" role="alert">{{ saveError }}</p>
    <p v-if="message" class="adm-alert" role="status">{{ message }}</p>

    <div v-if="data && settings" class="adm-stack">
      <section class="adm-panel" aria-labelledby="p-week">
        <div class="adm-panel__head">
          <div class="adm-week-nav">
            <a href="#" aria-label="Предыдущая неделя" @click.prevent="goWeek(-1)">←</a>
            <h2 id="p-week" class="adm-week-nav__title">{{ weekTitle(data.monday) }}</h2>
            <a href="#" aria-label="Следующая неделя" @click.prevent="goWeek(1)">→</a>
          </div>
          <p class="adm-panel__hint">
            Суп и горячее продаются и по отдельности · обед целиком обычно дешевле суммы
          </p>
        </div>

        <div class="adm-lang-tabs" role="tablist" aria-label="Язык названий">
          <button
            v-for="l in contentLocales"
            :key="l"
            type="button"
            role="tab"
            :aria-selected="lang === l"
            :class="{ 'is-untranslated': untranslated(l) }"
            @click="lang = l"
          >
            {{ l.toUpperCase() }}
          </button>
        </div>

        <fieldset :disabled="!canEdit" style="border: 0; padding: 0; margin: 0; min-width: 0">
          <table class="adm-calc adm-week">
            <thead>
              <tr>
                <th scope="col">День</th>
                <th scope="col">Суп ({{ lang.toUpperCase() }})</th>
                <th scope="col" class="num">Суп, €</th>
                <th scope="col">Горячее ({{ lang.toUpperCase() }})</th>
                <th scope="col" class="num">Горячее, €</th>
                <th scope="col" class="num">Обед целиком, €</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in days"
                :key="d.date"
                :class="{
                  'is-past': status(d.date) === 'past',
                  'is-today': status(d.date) === 'today',
                }"
              >
                <td class="adm-week__day">
                  <b>{{ d.name }}</b>
                  <small>
                    {{ shortDate(d.date) }}{{ status(d.date) === 'past' ? ' · прошёл' : ''
                    }}{{ status(d.date) === 'today' ? ' · сегодня' : '' }}
                  </small>
                </td>
                <td>
                  <label class="adm-vh" :for="`s-${d.date}`">Суп, {{ d.name }}</label>
                  <input
                    :id="`s-${d.date}`"
                    v-model="d.texts[lang].soup"
                    type="text"
                    maxlength="200"
                  />
                </td>
                <td class="num">
                  <label class="adm-vh" :for="`sp-${d.date}`">Цена супа, {{ d.name }}</label>
                  <input
                    :id="`sp-${d.date}`"
                    v-model="d.soup"
                    class="adm-week__price"
                    type="text"
                    inputmode="decimal"
                  />
                </td>
                <td>
                  <label class="adm-vh" :for="`h-${d.date}`">Горячее, {{ d.name }}</label>
                  <input
                    :id="`h-${d.date}`"
                    v-model="d.texts[lang].main"
                    type="text"
                    maxlength="200"
                  />
                </td>
                <td class="num">
                  <label class="adm-vh" :for="`hp-${d.date}`">Цена горячего, {{ d.name }}</label>
                  <input
                    :id="`hp-${d.date}`"
                    v-model="d.main"
                    class="adm-week__price"
                    type="text"
                    inputmode="decimal"
                  />
                </td>
                <td class="num">
                  <label class="adm-vh" :for="`p-${d.date}`"
                    >Цена обеда целиком, {{ d.name }}</label
                  >
                  <input
                    :id="`p-${d.date}`"
                    v-model="d.full"
                    class="adm-week__price"
                    type="text"
                    inputmode="decimal"
                  />
                </td>
              </tr>
              <tr class="is-closed">
                <td class="adm-week__day">
                  <b>Сб — Вс</b
                  ><small
                    >{{ shortDate(addDays(data.monday, 5)) }}–{{
                      shortDate(addDays(data.monday, 6))
                    }}</small
                  >
                </td>
                <td colspan="5">Дневного меню нет: обеды подаём в будни</td>
              </tr>
            </tbody>
          </table>
        </fieldset>
        <p class="adm-note" style="margin-top: 12px">
          Пустой день — меню на этот день нет. Если перевода нет, на сайте покажем эстонский текст.
        </p>
      </section>

      <div class="adm-two" aria-label="Настройки дневного меню">
        <section class="adm-panel" aria-labelledby="p-lunch-set">
          <h2 id="p-lunch-set" class="adm-panel__title" style="margin-bottom: 14px">Настройки</h2>
          <form class="adm-stack" style="gap: 16px" @submit.prevent="saveSettings">
            <fieldset
              :disabled="!canEdit"
              class="adm-stack"
              style="gap: 16px; border: 0; padding: 0; margin: 0"
            >
              <div class="field">
                <label class="adm-switch">
                  <input
                    v-model="settings.visible"
                    type="checkbox"
                    aria-describedby="l-show-hint"
                  />
                  <span class="adm-switch__track" />Показывать меню дня на сайте
                </label>
                <p id="l-show-hint" class="adm-panel__hint">
                  Выключите на время отпуска или праздников — пропадут страница «Меню дня» с
                  предзаказом и кнопка на неё в «Меню». Меню недели сохранится. Тот же переключатель
                  — в «Настройках сайта».
                </p>
              </div>
              <div class="field">
                <span class="adm-legend-title">Часы подачи</span>
                <div style="display: flex; gap: 10px; align-items: center">
                  <label class="adm-vh" for="l-from">С</label>
                  <input id="l-from" v-model="settings.servedFrom" type="time" />
                  —
                  <label class="adm-vh" for="l-to">До</label>
                  <input id="l-to" v-model="settings.servedTo" type="time" />
                </div>
              </div>
              <div class="field">
                <label for="l-in">Входит в обед целиком ({{ lang.toUpperCase() }})</label>
                <input id="l-in" v-model="settings.includes[lang]" type="text" maxlength="200" />
              </div>
              <div class="field">
                <label for="l-until">Предзаказ на сегодня — до</label>
                <input id="l-until" v-model="settings.preorderUntil" type="time" />
                <span class="adm-note"
                  >После этого времени заказать обед на сегодня нельзя, только на завтра</span
                >
              </div>
              <label class="adm-switch">
                <input v-model="settings.acceptPreorders" type="checkbox" />
                <span class="adm-switch__track" />Принимать предзаказ на сайте
              </label>
            </fieldset>
            <p v-if="settingsError" class="adm-note adm-danger" role="alert">{{ settingsError }}</p>
            <p v-if="settingsMessage" class="adm-note" role="status">{{ settingsMessage }}</p>
            <div v-if="canEdit">
              <button class="btn btn--sm" type="submit">Сохранить настройки</button>
            </div>
          </form>
        </section>

        <section class="adm-panel" aria-labelledby="p-lunch-help">
          <h2 id="p-lunch-help" class="adm-panel__title" style="margin-bottom: 10px">
            Как это работает
          </h2>
          <ul class="adm-help">
            <li>
              Меню заводится на неделю вперёд, по дням. «Скопировать прошлую неделю» заполняет
              только пустые дни.
            </li>
            <li>Дневное меню не связано с основным: блюда пишутся текстом.</li>
            <li>
              У супа и горячего своя цена — их берут и по отдельности. Цена обеда целиком
              показывается на сайте вместе с суммой по отдельности, зачёркнутой.
            </li>
            <li>Предзаказы будут приходить в «Заявки» с типом «Обед», оплата на месте.</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
