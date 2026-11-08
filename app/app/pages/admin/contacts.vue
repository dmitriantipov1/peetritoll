<script setup lang="ts">
// Контакты и часы (5.2). Разметка — из прототипа (admin/contacts.html).
// Показываются в подвале всех страниц и на странице ресторана; по часам будет работать бронь стола.
import { hoursLine, type AdminContacts } from '#shared/contacts'
import { contentLocales, type ContentLocale } from '#shared/locales'
import { shortDate, todayInTallinn } from '#shared/dates'

definePageMeta({ layout: 'admin', access: ['contacts'] })
defineI18nRoute(false)
useHead({ title: 'Контакты и часы — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('contacts', 'edit'))

const { data, error } = await useFetch<AdminContacts>('/api/admin/contacts')

const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const lang = ref<ContentLocale>('ru')

const form = ref<AdminContacts | null>(data.value ? structuredClone(toRaw(data.value)) : null)
const saved = ref(JSON.stringify(form.value))
const dirty = computed(() => JSON.stringify(form.value) !== saved.value)
watch(data, (d) => {
  if (!d) return
  form.value = structuredClone(toRaw(d))
  saved.value = JSON.stringify(form.value)
})

function addSpecialDay() {
  form.value?.hours.specialDays.push({
    date: todayInTallinn(),
    open: false,
    from: '11:00',
    to: '16:00',
    label: {},
  })
}

const message = ref('')
const saveError = ref('')
const saving = ref(false)

async function save() {
  if (!form.value) return
  message.value = ''
  saveError.value = ''
  saving.value = true
  try {
    data.value = await $fetch<AdminContacts>('/api/admin/contacts', {
      method: 'PUT',
      body: form.value,
    })
    message.value = 'Сохранено.'
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

// Предпросмотр подвала — как его соберёт сайт
const preview = computed(() => {
  const f = form.value
  if (!f) return []
  return [
    hoursLine(f.hours.week, lang.value),
    f.contacts.address[lang.value] || f.contacts.address.et || '',
    f.contacts.phone,
    f.contacts.email,
  ].filter(Boolean)
})
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Сайт</p>
        <h1 class="adm-top__title">Контакты и часы</h1>
        <p class="adm-top__meta">
          Показываются в подвале всех страниц и на странице ресторана · по часам будет работать
          форма брони
        </p>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving || !dirty">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить контакты.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть контакты.</p>
    <p v-if="saveError" class="adm-alert" role="alert">{{ saveError }}</p>
    <p v-if="message" class="adm-alert" role="status">{{ message }}</p>

    <fieldset
      v-if="form"
      :disabled="!canEdit"
      style="border: 0; padding: 0; margin: 0; min-width: 0"
    >
      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-hours">
            <div class="adm-panel__head">
              <h2 id="p-hours" class="adm-panel__title">Часы работы</h2>
              <p class="adm-panel__hint">Форма брони не предложит время, когда закрыто</p>
            </div>
            <table class="adm-hours">
              <thead>
                <tr>
                  <th scope="col">День</th>
                  <th scope="col">Работаем</th>
                  <th scope="col">Часы</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(day, i) in form.hours.week"
                  :key="i"
                  :class="{ 'is-closed': !day.open }"
                >
                  <td>{{ weekdays[i] }}</td>
                  <td>
                    <label class="adm-switch">
                      <input
                        v-model="day.open"
                        type="checkbox"
                        :aria-label="`${weekdays[i]}: открыто`"
                      />
                      <span class="adm-switch__track" />{{ day.open ? 'Открыто' : 'Закрыто' }}
                    </label>
                  </td>
                  <td>
                    <input
                      v-model="day.from"
                      type="time"
                      :disabled="!day.open"
                      :aria-label="`${weekdays[i]}: открытие`"
                    /><span class="adm-hours__dash">—</span
                    ><input
                      v-model="day.to"
                      type="time"
                      :disabled="!day.open"
                      :aria-label="`${weekdays[i]}: закрытие`"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Правила брони стола: поля выровнены по низу, чтобы разные по длине подписи не сдвигали их -->
            <div class="adm-rules">
              <div class="field">
                <label for="h-last">Последняя бронь, минут до закрытия</label>
                <input
                  id="h-last"
                  v-model.number="form.hours.lastBookingBeforeCloseMin"
                  type="number"
                  min="0"
                />
              </div>
              <div class="field">
                <label for="h-min">Бронь онлайн минимум за, часов</label>
                <input
                  id="h-min"
                  v-model.number="form.hours.bookingLeadHours"
                  type="number"
                  min="0"
                />
              </div>
              <div class="field">
                <label for="h-banq">Банкет — от скольких гостей</label>
                <input
                  id="h-banq"
                  v-model.number="form.hours.banquetFromGuests"
                  type="number"
                  min="1"
                />
              </div>
            </div>
            <p class="adm-note" style="margin-top: 14px">
              Срок предзаказа обеда на сегодня задаётся в
              <NuxtLink to="/admin/menu/lunch">настройках дневного меню</NuxtLink>.
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-special">
            <div class="adm-panel__head">
              <h2 id="p-special" class="adm-panel__title">Особые дни</h2>
              <button v-if="canEdit" class="adm-link-btn" type="button" @click="addSpecialDay">
                + День
              </button>
            </div>
            <p v-if="!form.hours.specialDays.length" class="adm-note">
              Праздники и сокращённые дни: например, 24.12 закрыто, 31.12 до 16:00.
            </p>
            <table v-else class="adm-hours">
              <thead>
                <tr>
                  <th scope="col">Дата</th>
                  <th scope="col">Работаем</th>
                  <th scope="col">Часы</th>
                  <th scope="col">Подпись на сайте ({{ lang.toUpperCase() }})</th>
                  <th scope="col"><span class="adm-vh">Удалить</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(day, i) in form.hours.specialDays" :key="i">
                  <td><input v-model="day.date" type="date" aria-label="Дата" /></td>
                  <td>
                    <label class="adm-switch">
                      <input
                        v-model="day.open"
                        type="checkbox"
                        :aria-label="`${shortDate(day.date)}: открыто`"
                      />
                      <span class="adm-switch__track" />{{ day.open ? 'Открыто' : 'Закрыто' }}
                    </label>
                  </td>
                  <td :class="{ 'is-closed': !day.open }">
                    <input
                      v-model="day.from"
                      type="time"
                      :disabled="!day.open"
                      aria-label="Открытие"
                    /><span class="adm-hours__dash">—</span
                    ><input
                      v-model="day.to"
                      type="time"
                      :disabled="!day.open"
                      aria-label="Закрытие"
                    />
                  </td>
                  <td>
                    <input
                      v-model="day.label[lang]"
                      type="text"
                      maxlength="100"
                      aria-label="Подпись"
                      placeholder="Сочельник"
                    />
                  </td>
                  <td>
                    <button
                      v-if="canEdit"
                      class="adm-icon-btn"
                      type="button"
                      aria-label="Удалить особый день"
                      @click="form.hours.specialDays.splice(i, 1)"
                    >
                      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="adm-note" style="margin-top: 12px">
              Особые дни важнее обычного расписания. За неделю до даты сайт покажет предупреждение в
              подвале.
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-cont">
            <div class="adm-panel__head">
              <h2 id="p-cont" class="adm-panel__title">Адрес и связь</h2>
            </div>
            <div class="form">
              <div class="field form__full">
                <label for="c-addr">Адрес ({{ lang.toUpperCase() }})</label>
                <input
                  id="c-addr"
                  v-model="form.contacts.address[lang]"
                  type="text"
                  maxlength="200"
                />
              </div>
              <div class="field">
                <label for="c-phone">Телефон</label>
                <input id="c-phone" v-model="form.contacts.phone" type="tel" />
              </div>
              <div class="field">
                <label for="c-wa">WhatsApp</label>
                <input id="c-wa" v-model="form.contacts.whatsapp" type="tel" />
              </div>
              <div class="field">
                <label for="c-mail">E-mail для гостей</label>
                <input id="c-mail" v-model="form.contacts.email" type="email" />
              </div>
              <div class="field">
                <label for="c-map">Ссылка на карту</label>
                <input id="c-map" v-model="form.contacts.mapUrl" type="url" />
              </div>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-soc">
            <div class="adm-panel__head">
              <h2 id="p-soc" class="adm-panel__title">Соцсети в подвале</h2>
              <p class="adm-panel__hint">Только ссылки, без виджетов</p>
            </div>
            <div class="form" style="grid-template-columns: 1fr">
              <div class="field">
                <label for="s-fb">Facebook</label>
                <input id="s-fb" v-model="form.contacts.facebook" type="url" />
              </div>
              <div class="field">
                <label for="s-ta">TripAdvisor</label>
                <input
                  id="s-ta"
                  v-model="form.contacts.tripadvisor"
                  type="url"
                  placeholder="https://www.tripadvisor.com/…"
                />
              </div>
              <div class="field">
                <label for="s-fs">Foursquare</label>
                <input
                  id="s-fs"
                  v-model="form.contacts.foursquare"
                  type="url"
                  placeholder="https://foursquare.com/…"
                />
              </div>
            </div>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Как это выглядит">
          <section class="adm-panel" aria-labelledby="p-prev">
            <h2 id="p-prev" class="adm-panel__title" style="margin-bottom: 14px">
              Так в подвале сайта
            </h2>
            <div class="adm-lang-tabs" role="tablist" aria-label="Язык">
              <button
                v-for="l in contentLocales"
                :key="l"
                type="button"
                role="tab"
                :aria-selected="lang === l"
                :class="{ 'is-untranslated': !form.contacts.address[l] }"
                @click="lang = l"
              >
                {{ l.toUpperCase() }}
              </button>
            </div>
            <div class="adm-footer-preview">
              <small>Предпросмотр · {{ lang.toUpperCase() }}</small>
              <template v-for="line in preview" :key="line">{{ line }}<br /></template>
            </div>
            <p class="adm-note" style="margin-top: 12px">
              Строку с часами сайт собирает сам из таблицы и переводит на ET и EN — вручную её
              писать не нужно. Переключатель языка меняет и поля адреса и подписей особых дней.
            </p>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
