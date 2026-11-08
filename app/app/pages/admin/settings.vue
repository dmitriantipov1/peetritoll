<script setup lang="ts">
// Настройки сайта (5.2). Разметка — из прототипа (admin/settings.html).
// Отметки блюд, которые в прототипе были здесь, живут в «Меню → Категории и отметки» (7.1).
import { siteSections, type AdminSiteSettings, type SectionKey } from '#shared/site-settings'
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { MediaImage } from '#shared/media'

definePageMeta({ layout: 'admin', access: ['settings'] })
defineI18nRoute(false)
useHead({ title: 'Настройки сайта — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('settings', 'edit'))

const { data, error } = await useFetch<AdminSiteSettings>('/api/admin/settings')

const form = ref<AdminSiteSettings | null>(data.value ? structuredClone(toRaw(data.value)) : null)
const saved = ref(JSON.stringify(form.value))
const dirty = computed(() => JSON.stringify(form.value) !== saved.value)
watch(data, (d) => {
  if (!d) return
  form.value = structuredClone(toRaw(d))
  saved.value = JSON.stringify(form.value)
})

const localeNames: Record<ContentLocale, string> = {
  et: 'эстонской',
  en: 'английской',
  ru: 'русской',
}

/** Раздел выключен целиком, если выключен он сам или раздел, в который он входит */
function offByParent(key: SectionKey) {
  const parent = siteSections.find((s) => s.key === key && 'parent' in s)
  return (
    !!parent && 'parent' in parent && !form.value?.sections[parent.parent as SectionKey].enabled
  )
}

// Афиша по умолчанию — через загрузку картинки, как фото блюда
const poster = computed({
  get: () => form.value?.events.defaultPoster ?? null,
  set: (image: MediaImage | null) => {
    if (!form.value) return
    form.value.events.defaultPoster = image
    form.value.events.defaultPosterId = image?.id ?? null
  },
})

const message = ref('')
const saveError = ref('')
const saving = ref(false)

async function save() {
  if (!form.value) return
  message.value = ''
  saveError.value = ''
  saving.value = true
  try {
    const { sections, notifications, events } = form.value
    data.value = await $fetch<AdminSiteSettings>('/api/admin/settings', {
      method: 'PUT',
      body: {
        sections,
        notifications,
        events: { rotateSeconds: events.rotateSeconds, defaultPosterId: events.defaultPosterId },
      },
    })
    message.value = 'Настройки сохранены.'
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Сайт</p>
        <h1 class="adm-top__title">Настройки сайта</h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving || !dirty">
          {{ saving ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить настройки.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть настройки.</p>
    <p v-if="saveError" class="adm-alert" role="alert">{{ saveError }}</p>
    <p v-if="message" class="adm-alert" role="status">{{ message }}</p>

    <fieldset
      v-if="form"
      :disabled="!canEdit"
      style="border: 0; padding: 0; margin: 0; min-width: 0"
    >
      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-sec">
            <div class="adm-panel__head">
              <h2 id="p-sec" class="adm-panel__title">Разделы сайта</h2>
              <p class="adm-panel__hint">Выключенный — пропадает из меню и ссылок</p>
            </div>
            <ul class="adm-sections">
              <li
                v-for="s in siteSections"
                :key="s.key"
                :class="{ 'is-sub': 'parent' in s, 'adm-row--hidden': offByParent(s.key) }"
              >
                <div>
                  <b>{{ s.title }}</b>
                  <small
                    ><code>{{ s.path }}</code> · {{ s.note }}</small
                  >
                </div>
                <div>
                  <span class="adm-loc">
                    <button
                      v-for="l in contentLocales"
                      :key="l"
                      type="button"
                      :aria-pressed="form.sections[s.key].locales[l]"
                      :title="`${l.toUpperCase()}: ${form.sections[s.key].locales[l] ? 'показан' : 'скрыт'}`"
                      :aria-label="`${s.title}: в ${localeNames[l]} версии — ${form.sections[s.key].locales[l] ? 'показан' : 'скрыт'}`"
                      @click="form.sections[s.key].locales[l] = !form.sections[s.key].locales[l]"
                    >
                      {{ l.toUpperCase() }}
                    </button>
                  </span>
                </div>
                <div>
                  <label class="adm-switch">
                    <input
                      v-model="form.sections[s.key].enabled"
                      type="checkbox"
                      :aria-label="`${s.title}: показывать на сайте`"
                    />
                    <span class="adm-switch__track" />
                    {{ form.sections[s.key].enabled ? 'На сайте' : 'Скрыто' }}
                  </label>
                </div>
              </li>
            </ul>
            <p class="adm-note" style="margin-top: 12px">
              Кнопки языков — показывать ли раздел в этой версии сайта. Внутри раздела у каждого
              товара и материала свои языки. Раздел внутри выключенного тоже не показывается.
            </p>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Уведомления и мероприятия">
          <section class="adm-panel" aria-labelledby="p-notify">
            <h2 id="p-notify" class="adm-panel__title" style="margin-bottom: 14px">Уведомления</h2>
            <div class="adm-stack" style="gap: 16px">
              <div class="field">
                <label for="n-mail">Заявки и заказы на почту</label>
                <input id="n-mail" v-model="form.notifications.email" type="email" />
                <span class="adm-note">С этого адреса удобно сразу ответить гостю</span>
              </div>
              <div class="field">
                <span class="adm-legend-title">Канал в Telegram</span>
                <span class="adm-note">
                  Подключим вместе с заявками: каждая заявка — отдельным сообщением
                </span>
              </div>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-events-rot">
            <h2 id="p-events-rot" class="adm-panel__title" style="margin-bottom: 14px">
              Мероприятия и афиши
            </h2>
            <div class="adm-stack" style="gap: 16px">
              <div class="field">
                <label for="e-interval">Смена мероприятия и афиши, секунд</label>
                <input
                  id="e-interval"
                  v-model.number="form.events.rotateSeconds"
                  type="number"
                  min="3"
                  max="60"
                />
                <span class="adm-note">
                  В блоке «Мероприятия» на главной и в «Музее» события выделяются по очереди, вместе
                  с ними меняется афиша. Наведение мышью ставит смену на паузу
                </span>
              </div>
              <div class="field">
                <span class="adm-legend-title">Афиша по умолчанию</span>
                <AdminImageUpload
                  v-model:image="poster"
                  compact
                  :disabled="!canEdit"
                  alt="Афиша по умолчанию"
                />
                <span class="adm-note">Для мероприятий без своей афиши</span>
              </div>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-langs">
            <h2 id="p-langs" class="adm-panel__title" style="margin-bottom: 14px">Языки</h2>
            <dl class="adm-facts">
              <div>
                <dt>Версии сайта</dt>
                <dd>Эстонская, английская, русская</dd>
              </div>
              <div>
                <dt>По умолчанию</dt>
                <dd>Эстонская</dd>
              </div>
              <div>
                <dt>Если перевода нет</dt>
                <dd>Показываем эстонский текст</dd>
              </div>
            </dl>
            <p class="adm-note" style="margin-top: 12px">
              Язык браузера учитываем только при первом входе на главную, на внутренних страницах —
              никогда
            </p>
          </section>
        </aside>
      </div>
    </fieldset>
  </form>
</template>
