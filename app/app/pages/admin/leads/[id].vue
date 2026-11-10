<script setup lang="ts">
// Карточка лида (8.2): контакт, теги, события (заявки), рассылка, согласия, возможные дубли.
// Разметка и классы — из прототипа (admin/lead.html). Объединение дублей и удаление
// по просьбе гостя — следующим шагом.
import { contentLocales, type ContentLocale } from '#shared/locales'
import { fullDate, momentLabel, shortDate, todayInTallinn } from '#shared/dates'
import { plural } from '#shared/plural'
import { leadCategoryNames, type AdminLead, type LeadTagCount } from '#shared/leads'
import { requestSection, requestStatusNames, requestTypeNames } from '#shared/requests'

definePageMeta({ layout: 'admin', access: ['leads'] })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()
const canEdit = computed(() => can('leads', 'edit'))

const [{ data: lead, error }, { data: allTags }] = await Promise.all([
  useFetch<AdminLead>(() => `/api/admin/leads/${route.params.id}`),
  useFetch<LeadTagCount[]>('/api/admin/leads/tags'),
])
useHead({ title: () => `${lead.value?.name ?? 'Контакт'} — админка Peetri Toll` })

// ---------- Форма ----------

function initialState() {
  const l = lead.value
  return {
    name: l?.name ?? '',
    email: l?.email ?? '',
    phone: l?.phone ?? '',
    locale: (l?.locale ?? 'et') as ContentLocale,
    tags: (l?.tags ?? []).filter((t) => !t.auto).map((t) => t.tag),
    marketingOff: false,
  }
}
const form = reactive(initialState())
watch(lead, () => Object.assign(form, initialState()))

const autoTags = computed(() => (lead.value?.tags ?? []).filter((t) => t.auto).map((t) => t.tag))

const tagInput = ref('')
/** Подсказки: теги других контактов, которых у этого ещё нет */
const suggestions = computed(() =>
  (allTags.value ?? []).filter(
    (t) => !t.auto && !form.tags.includes(t.tag) && !autoTags.value.includes(t.tag),
  ),
)
function addTag() {
  const tag = tagInput.value.trim().replace(/,$/, '').trim()
  tagInput.value = ''
  if (!tag || form.tags.includes(tag) || autoTags.value.includes(tag)) return
  form.tags = [...form.tags, tag]
}
/** Enter или запятая — тег готов */
function onTagKey(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ',') return
  e.preventDefault()
  addTag()
}
function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
const issues = ref<Record<string, string>>({})

async function save() {
  const l = lead.value
  if (!l) return
  if (tagInput.value.trim()) addTag()
  saveError.value = ''
  issues.value = {}
  saving.value = true
  try {
    lead.value = await $fetch<AdminLead>(`/api/admin/leads/${l.id}`, { method: 'PUT', body: form })
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    issues.value = apiErrorIssues(e)
  } finally {
    saving.value = false
  }
}

async function unsubscribe() {
  if (!confirm('Отписать от рассылки? Снова подписаться сможет только сам гость.')) return
  form.marketingOff = true
  await save()
}

// ---------- Подписи ----------

const localeNames: Record<ContentLocale, string> = {
  et: 'Эстонский',
  en: 'Английский',
  ru: 'Русский',
}

const meta = computed(() => {
  const l = lead.value
  if (!l) return ''
  const parts = [`Контакт с ${fullDate(toDate(l.createdAt))}`]
  parts.push(`${l.events} ${plural(l.events, ['событие', 'события', 'событий'])}`)
  if (l.categories.length) {
    parts.push(
      `категории: ${l.categories.map((c) => leadCategoryNames[c].toLowerCase()).join(', ')}`,
    )
  }
  return parts.join(' · ')
})

function toDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tallinn' }).format(new Date(iso))
}

const thisYear = todayInTallinn().slice(0, 4)
function visitLabel(e: AdminLead['history'][number]): string {
  const parts: string[] = []
  if (e.visitDate) {
    const d = e.visitDate.slice(0, 4) === thisYear ? shortDate(e.visitDate) : fullDate(e.visitDate)
    parts.push(e.visitTime ? `${d}, ${e.visitTime}` : d)
  }
  if (e.guests) parts.push(`${e.guests} ${plural(e.guests, ['гость', 'гостя', 'гостей'])}`)
  return parts.join(' · ')
}

const eventsHint = computed(() => {
  const n = lead.value?.events ?? 0
  return n > 1 ? `${n} ${plural(n, ['заявка', 'заявки', 'заявок'])} — один контакт` : ''
})
</script>

<template>
  <div>
    <NuxtLink v-if="error" class="adm-back" to="/admin/leads">← Все лиды</NuxtLink>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить контакт.') }}
    </p>

    <form v-if="lead" @submit.prevent="save">
      <header class="adm-top">
        <div>
          <NuxtLink class="adm-back" to="/admin/leads">← Все лиды</NuxtLink>
          <h1 class="adm-top__title">{{ lead.name }}</h1>
          <p class="adm-top__meta">{{ meta }}</p>
        </div>
        <div class="adm-top__actions">
          <a v-if="lead.email" class="btn btn--sm" :href="`mailto:${lead.email}`">Написать</a>
          <button v-if="canEdit" class="btn btn--solid btn--sm" type="submit" :disabled="saving">
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </button>
        </div>
      </header>

      <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
      <p v-if="saveError" class="adm-alert" role="alert">{{ saveError }}</p>

      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-contact">
            <div class="adm-panel__head">
              <h2 id="p-contact" class="adm-panel__title">Контакт</h2>
              <p class="adm-panel__hint">Ключ склейки — e-mail, запасной — телефон</p>
            </div>
            <fieldset class="form adm-fieldset" :disabled="!canEdit">
              <div class="field">
                <label for="c-name">Имя</label>
                <input id="c-name" v-model="form.name" type="text" maxlength="100" required />
                <span v-if="issues.name" class="adm-note adm-danger">{{ issues.name }}</span>
              </div>
              <div class="field">
                <label for="c-lang">Язык писем</label>
                <select id="c-lang" v-model="form.locale">
                  <option v-for="l in contentLocales" :key="l" :value="l">
                    {{ localeNames[l] }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label for="c-mail">E-mail</label>
                <input id="c-mail" v-model="form.email" type="email" maxlength="200" />
                <span v-if="issues.email" class="adm-note adm-danger">{{ issues.email }}</span>
              </div>
              <div class="field">
                <label for="c-phone">Телефон</label>
                <input id="c-phone" v-model="form.phone" type="tel" maxlength="40" />
                <span v-if="issues.phone" class="adm-note adm-danger">{{ issues.phone }}</span>
              </div>
            </fieldset>
          </section>

          <section class="adm-panel" aria-labelledby="p-tags">
            <div class="adm-panel__head">
              <h2 id="p-tags" class="adm-panel__title">Теги</h2>
              <p class="adm-panel__hint">Перейдут в Mautic как есть — называйте осмысленно</p>
            </div>
            <label class="adm-vh" for="t-input">Добавить тег</label>
            <div class="adm-tag-input">
              <span v-for="t in autoTags" :key="t" class="adm-tag adm-tag--auto">{{ t }}</span>
              <span v-for="t in form.tags" :key="t" class="adm-tag adm-tag--hand"
                >{{ t
                }}<button
                  v-if="canEdit"
                  type="button"
                  :aria-label="`Убрать тег «${t}»`"
                  @click="removeTag(t)"
                >
                  ×
                </button></span
              >
              <input
                v-if="canEdit"
                id="t-input"
                v-model="tagInput"
                type="text"
                maxlength="60"
                autocomplete="off"
                list="t-suggest"
                placeholder="новый тег и Enter"
                @keydown="onTagKey"
              />
            </div>
            <datalist id="t-suggest">
              <option v-for="t in suggestions" :key="t.tag" :value="t.tag">
                у {{ t.count }} {{ plural(t.count, ['контакта', 'контактов', 'контактов']) }}
              </option>
            </datalist>
            <p class="adm-note" style="margin-top: 12px">
              Пунктирные теги сайт ставит сам по источнику, их не убрать — они показывают, откуда
              пришёл человек. Свои теги — любые: «постоянный гость», «годовщина».
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-events">
            <div class="adm-panel__head">
              <h2 id="p-events" class="adm-panel__title">События</h2>
              <p v-if="eventsHint" class="adm-panel__hint">{{ eventsHint }}</p>
            </div>
            <ul class="adm-events">
              <li v-for="e in lead.history" :key="e.requestId">
                <time :datetime="e.createdAt">{{ fullDate(toDate(e.createdAt)) }}</time>
                <span>{{ requestTypeNames[e.type] }}</span>
                <span>
                  {{ [visitLabel(e), e.summary].filter(Boolean).join(' · ') }}
                  <small>{{ requestStatusNames[e.status] }}</small>
                </span>
                <NuxtLink v-if="can(requestSection[e.type])" :to="`/admin/requests/${e.requestId}`">
                  № {{ e.requestId }}
                </NuxtLink>
                <span v-else>№ {{ e.requestId }}</span>
              </li>
            </ul>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Согласия и данные">
          <section class="adm-panel" aria-labelledby="p-mail">
            <h2 id="p-mail" class="adm-panel__title" style="margin-bottom: 14px">Рассылка</h2>
            <p>
              <b>{{
                lead.marketing === 'yes'
                  ? 'Согласен(на)'
                  : lead.marketing === 'pending'
                    ? 'Ждёт подтверждения по письму'
                    : 'Не согласен(на)'
              }}</b>
            </p>
            <p v-if="lead.marketingAt" class="adm-note">
              {{ momentLabel(new Date(lead.marketingAt)) }}
              <template v-if="lead.marketingSource"> · {{ lead.marketingSource }}</template>
            </p>
            <p class="adm-note" style="margin-top: 12px">
              Согласие на обработку данных ради брони <b>не даёт права</b> на рассылку. Включить её
              может только сам гость — галочкой в форме или подпиской.
            </p>
            <div v-if="canEdit && lead.marketing !== 'no'" class="adm-actions">
              <button class="btn btn--sm adm-danger" type="button" @click="unsubscribe">
                Отписать…
              </button>
            </div>
          </section>

          <section class="adm-panel" aria-labelledby="p-consent">
            <h2 id="p-consent" class="adm-panel__title" style="margin-bottom: 14px">Согласия</h2>
            <dl class="adm-facts">
              <div>
                <dt>На обработку данных</dt>
                <dd>
                  <template v-if="lead.consent">
                    {{ momentLabel(new Date(lead.consent.at)) }} · заявка №
                    {{ lead.consent.requestId }} · политика, версия {{ lead.consent.policyVersion }}
                  </template>
                  <template v-else>Нет — заявки внесены вручную</template>
                </dd>
              </div>
              <div>
                <dt>Mautic</dt>
                <dd>
                  {{
                    lead.marketing === 'yes'
                      ? 'Уедет при выгрузке · этап 5'
                      : 'Не выгружается — нет согласия на рассылку · этап 5'
                  }}
                </dd>
              </div>
            </dl>
          </section>

          <section v-if="lead.dupes.length" class="adm-panel" aria-labelledby="p-dupe">
            <h2 id="p-dupe" class="adm-panel__title" style="margin-bottom: 14px">
              Возможный дубль
            </h2>
            <div v-for="d in lead.dupes" :key="d.id" class="adm-dupe">
              <p>
                <NuxtLink :to="`/admin/leads/${d.id}`"
                  ><b>{{ d.name }}</b></NuxtLink
                >
                · {{ d.events }} {{ plural(d.events, ['событие', 'события', 'событий']) }}
              </p>
              <p>
                {{ d.email ?? 'без почты' }} · <mark>{{ d.phone }}</mark>
              </p>
              <p class="adm-note">Совпал телефон, почта другая</p>
            </div>
            <p class="adm-note" style="margin-top: 10px">
              Объединить контакты можно будет следующим шагом. Это может быть и семья с общим
              номером — склеиваем только руками.
            </p>
          </section>
        </aside>
      </div>
    </form>
  </div>
</template>
