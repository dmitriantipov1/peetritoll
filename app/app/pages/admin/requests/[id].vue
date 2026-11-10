<script setup lang="ts">
// Карточка заявки (7.1): визит, расчёт, гость, история, статус. Разметка и классы — из прототипа
// (admin/request-table.html, admin/request-banquet.html). Без права «правит» — только просмотр.
// Расчёт пока только для чтения; письмо гостю и Excel — со слоем уведомлений.
import { requestSections } from '~/utils/admin-nav'
import { fullDate, momentLabel, todayInTallinn, weekday } from '#shared/dates'
import { formatPrice } from '#shared/money'
import { plural } from '#shared/plural'
import {
  banquetOccasionNames,
  lunchModeNames,
  requestFieldNames,
  requestSection,
  requestStatusNames,
  requestStatuses,
  requestTypeNames,
  ruFirst,
  tableOccasionNames,
  tourTopicNames,
  type AdminRequest,
  type AdminRequestCalcLine,
  type AdminRequestHistoryItem,
  type RequestChange,
  type RequestSave,
  type RequestStatus,
} from '#shared/requests'
import { banquetTierTitles } from '#shared/catalog'

definePageMeta({ layout: 'admin', access: requestSections })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()

const { data: request, error } = await useFetch<AdminRequest>(
  () => `/api/admin/requests/${route.params.id}`,
)

const title = computed(() =>
  request.value ? `${requestTypeNames[request.value.type]} № ${request.value.id}` : 'Заявка',
)
useHead({ title: () => `${title.value} — админка Peetri Toll` })

const canEdit = computed(() => !!request.value && can(requestSection[request.value.type], 'edit'))

// ---------- Форма ----------

function initialState() {
  const r = request.value
  return {
    visitDate: r?.visitDate ?? '',
    visitTime: r?.visitTime ?? '',
    guests: r?.guests ?? ('' as number | ''),
    name: r?.name ?? '',
    phone: r?.phone ?? '',
    email: r?.email ?? '',
    staffNote: r?.staffNote ?? '',
    status: (r?.status ?? 'new') as RequestStatus,
    note: '',
  }
}
const form = reactive(initialState())
watch(request, () => Object.assign(form, initialState()))

/** Какие поля визита есть у вида: у экскурсии нет времени, у записи на мероприятие — даты */
const hasDate = computed(() => request.value?.type !== 'event')
const hasTime = computed(() => !['tour', 'event'].includes(request.value?.type ?? ''))
const hasGuests = computed(() => request.value?.type !== 'lunch')

/** «в заявке было 18:30» — если поле поменяли после поступления */
function was(field: 'visitDate' | 'visitTime' | 'guests'): string | null {
  const r = request.value
  if (!r) return null
  const original = r.original[field]
  if (original === r[field]) return null
  if (original === null) return 'в заявке не было'
  return `в заявке было ${field === 'visitDate' ? fullDate(String(original)) : original}`
}

const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
const issues = ref<Record<string, string>>({})

async function save() {
  const r = request.value
  if (!r) return
  saveError.value = ''
  issues.value = {}
  saving.value = true
  const body: RequestSave = {
    name: form.name,
    phone: form.phone,
    email: form.email,
    staffNote: form.staffNote,
    status: form.status,
    note: form.note,
  }
  if (hasDate.value) body.visitDate = form.visitDate || null
  if (hasTime.value) body.visitTime = form.visitTime || null
  if (hasGuests.value) body.guests = form.guests === '' ? null : Number(form.guests)
  try {
    request.value = await $fetch<AdminRequest>(`/api/admin/requests/${r.id}`, {
      method: 'PUT',
      body,
    })
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
  } catch (e) {
    saveError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    issues.value = apiErrorIssues(e)
  } finally {
    saving.value = false
  }
}

// ---------- Подписи ----------

const statusClass: Record<RequestStatus, string> = {
  new: 'adm-status--new',
  in_progress: 'adm-status--work',
  confirmed: 'adm-status--done',
  cancelled: 'adm-status--cancel',
}
const segClass: Record<RequestStatus, string> = {
  new: 'is-new',
  in_progress: 'is-work',
  confirmed: 'is-done',
  cancelled: 'is-cancel',
}

const weekdayNames = [
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
  'воскресенье',
]

/** «Елена Мельник · пятница, 31 октября, 18:00 · 2 гостя» */
const meta = computed(() => {
  const r = request.value
  if (!r) return ''
  const parts = [r.name]
  if (r.visitDate) {
    const day = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      ...(r.visitDate.slice(0, 4) === todayInTallinn().slice(0, 4) ? {} : { year: 'numeric' }),
      timeZone: 'UTC',
    }).format(new Date(`${r.visitDate}T12:00:00Z`))
    parts.push(
      [weekdayNames[weekday(r.visitDate) - 1], day, r.visitTime].filter(Boolean).join(', '),
    )
  }
  if (r.guests) parts.push(`${r.guests} ${plural(r.guests, ['гость', 'гостя', 'гостей'])}`)
  const d = r.details
  if (d.type === 'banquet' && d.occasion) parts.push(banquetOccasionNames[d.occasion].toLowerCase())
  return parts.join(' · ')
})

/** Своё у вида — строками «что — значение» */
const facts = computed(() => {
  const d = request.value?.details
  if (!d) return []
  switch (d.type) {
    case 'table':
      return d.occasion ? [['Повод', tableOccasionNames[d.occasion]]] : []
    case 'banquet':
      return d.occasion ? [['Повод', banquetOccasionNames[d.occasion]]] : []
    case 'group':
      return [['Группа или агентство', d.agency ?? 'не указано']]
    case 'lunch':
      return [['Как', lunchModeNames[d.mode]]]
    case 'tour':
      return [['Что интересует', tourTopicNames[d.topic]]]
    case 'event':
      return [['Мероприятие', ruFirst(d.title)]]
  }
  return []
})
const eventLink = computed(() => {
  const d = request.value?.details
  return d?.type === 'event' && can('materials') ? `/admin/materials/${d.materialId}` : null
})

// ---------- Расчёт ----------

const calcGroups = computed(() => {
  const groups: { name: string; lines: AdminRequestCalcLine[] }[] = []
  for (const line of request.value?.calc?.lines ?? []) {
    const name = ruFirst(line.category)
    let group = groups.find((g) => g.name === name)
    if (!group) groups.push((group = { name, lines: [] }))
    group.lines.push(line)
  }
  return groups
})
const perGuest = computed(() => {
  const r = request.value
  return r?.calc && r.guests ? Math.round(r.calc.totalCents / r.guests) : null
})
const calcHint = computed(() => {
  const d = request.value?.details
  return d?.type === 'banquet' && d.setTier
    ? `Начато с сета: ${banquetTierTitles[d.setTier].toLowerCase()}`
    : ''
})

// ---------- История ----------

function value(change: RequestChange, side: 'from' | 'to'): string {
  const v = change[side]
  if (v === null || v === '') return '—'
  if (change.field === 'status') return requestStatusNames[v as RequestStatus]
  if (change.field === 'visitDate') return fullDate(String(v))
  return String(v)
}

function historyText(item: AdminRequestHistoryItem): string {
  const r = request.value!
  switch (item.kind) {
    case 'created':
      return r.source === 'site' ? 'Заявка с сайта' : 'Заявка внесена вручную'
    case 'notified':
      return item.note ?? 'Уведомление'
    default:
      return ''
  }
}

const localeNames = { et: 'эстонская', en: 'английская', ru: 'русская' } as const
const source = computed(() => {
  const r = request.value
  if (!r) return ''
  return r.source === 'site'
    ? `Сайт, ${localeNames[r.locale]} версия`
    : `Внесена вручную${r.createdByName ? `: ${r.createdByName}` : ''}`
})
</script>

<template>
  <div>
    <NuxtLink v-if="error" class="adm-back" to="/admin">← Все заявки</NuxtLink>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить заявку.') }}
    </p>

    <form v-if="request" @submit.prevent="save">
      <header class="adm-top">
        <div>
          <NuxtLink class="adm-back" to="/admin">← Все заявки</NuxtLink>
          <h1 class="adm-top__title">
            {{ title }}
            <span class="adm-status" :class="statusClass[request.status]">
              {{ requestStatusNames[request.status] }}
            </span>
          </h1>
          <p class="adm-top__meta">{{ meta }}</p>
        </div>
      </header>

      <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
      <p v-if="saveError" class="adm-alert" role="alert">{{ saveError }}</p>

      <div class="adm-layout">
        <div class="adm-stack">
          <section class="adm-panel" aria-labelledby="p-visit">
            <div class="adm-panel__head">
              <h2 id="p-visit" class="adm-panel__title">Визит</h2>
              <p class="adm-panel__hint">Золотая рамка — поле изменено после поступления заявки</p>
            </div>
            <dl v-if="facts.length" class="adm-facts" style="margin-bottom: 16px">
              <div v-for="[label, text] in facts" :key="label">
                <dt>{{ label }}</dt>
                <dd>
                  <NuxtLink v-if="eventLink && label === 'Мероприятие'" :to="eventLink">
                    {{ text }}
                  </NuxtLink>
                  <template v-else>{{ text }}</template>
                </dd>
              </div>
            </dl>
            <fieldset class="form adm-fieldset" :disabled="!canEdit">
              <div v-if="hasDate" class="field" :class="{ 'is-changed': was('visitDate') }">
                <label for="v-date">Дата</label>
                <input id="v-date" v-model="form.visitDate" type="date" />
                <span v-if="was('visitDate')" class="field__was">{{ was('visitDate') }}</span>
                <span v-if="issues.visitDate" class="adm-note adm-danger">{{
                  issues.visitDate
                }}</span>
              </div>
              <div v-if="hasTime" class="field" :class="{ 'is-changed': was('visitTime') }">
                <label for="v-time">Время</label>
                <input id="v-time" v-model="form.visitTime" type="time" />
                <span v-if="was('visitTime')" class="field__was">{{ was('visitTime') }}</span>
                <span v-if="issues.visitTime" class="adm-note adm-danger">{{
                  issues.visitTime
                }}</span>
              </div>
              <div v-if="hasGuests" class="field" :class="{ 'is-changed': was('guests') }">
                <label for="v-guests">{{ request.type === 'event' ? 'Человек' : 'Гостей' }}</label>
                <input id="v-guests" v-model="form.guests" type="number" min="1" max="500" />
                <span v-if="was('guests')" class="field__was">{{ was('guests') }}</span>
                <span v-if="issues.guests" class="adm-note adm-danger">{{ issues.guests }}</span>
              </div>
              <div class="field form__full">
                <label for="v-comment">Комментарий гостя</label>
                <textarea id="v-comment" :value="request.comment ?? '—'" readonly />
              </div>
              <div class="field form__full">
                <label for="v-note">
                  Заметка для персонала <span style="font-weight: 400">— гость её не видит</span>
                </label>
                <textarea id="v-note" v-model="form.staffNote" maxlength="4000" />
              </div>
            </fieldset>
          </section>

          <section v-if="request.calc" class="adm-panel" aria-labelledby="p-calc">
            <div class="adm-panel__head">
              <h2 id="p-calc" class="adm-panel__title">Расчёт</h2>
              <p v-if="calcHint" class="adm-panel__hint">{{ calcHint }}</p>
            </div>
            <p v-if="!request.calc.lines.length" class="adm-note">
              Гость ничего не выбрал в калькуляторе — меню обсудить при звонке.
            </p>
            <table v-else class="adm-calc">
              <thead>
                <tr>
                  <th scope="col">{{ request.type === 'lunch' ? 'Позиция' : 'Блюдо' }}</th>
                  <th scope="col" class="num">
                    {{ request.type === 'lunch' ? 'Цена' : 'Цена за порцию' }}
                  </th>
                  <th scope="col" class="num">
                    {{ request.type === 'lunch' ? 'Штук' : 'Порций' }}
                  </th>
                  <th scope="col" class="num">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="g in calcGroups" :key="g.name">
                  <tr v-if="g.name" class="adm-calc__cat">
                    <td colspan="4">{{ g.name }}</td>
                  </tr>
                  <tr v-for="(l, i) in g.lines" :key="i">
                    <td>{{ ruFirst(l.names) }}</td>
                    <td class="num">
                      {{ formatPrice(l.priceCents) }}
                      <span v-if="l.nowCents === null" class="adm-calc__now">
                        блюда уже нет в каталоге
                      </span>
                      <span v-else-if="l.nowCents !== l.priceCents" class="adm-calc__now">
                        в каталоге уже {{ formatPrice(l.nowCents) }}
                      </span>
                    </td>
                    <td class="num">{{ l.qty }}</td>
                    <td class="num">{{ formatPrice(l.priceCents * l.qty) }}</td>
                  </tr>
                </template>
              </tbody>
              <tfoot>
                <tr>
                  <td><span class="adm-calc__label">Ориентировочно</span></td>
                  <td class="num" colspan="2">
                    <template v-if="perGuest">≈ {{ formatPrice(perGuest) }} на гостя</template>
                  </td>
                  <td class="num">
                    <span class="adm-calc__total">{{ formatPrice(request.calc.totalCents) }}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <p class="adm-note" style="margin-top: 10px">
              Цены — снимок на момент отправки, {{ momentLabel(new Date(request.calc.pricedAt)) }}.
              Предварительный расчёт, не является офертой.
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-guest">
            <div class="adm-panel__head">
              <h2 id="p-guest" class="adm-panel__title">Гость</h2>
            </div>
            <fieldset class="form adm-fieldset" :disabled="!canEdit">
              <div class="field">
                <label for="g-name">Имя</label>
                <input id="g-name" v-model="form.name" type="text" maxlength="100" required />
                <span v-if="issues.name" class="adm-note adm-danger">{{ issues.name }}</span>
              </div>
              <div class="field">
                <label for="g-phone">Телефон</label>
                <input id="g-phone" v-model="form.phone" type="tel" maxlength="40" required />
                <span v-if="issues.phone" class="adm-note adm-danger">{{ issues.phone }}</span>
              </div>
              <div class="field">
                <label for="g-mail">E-mail</label>
                <input id="g-mail" v-model="form.email" type="email" maxlength="200" />
                <span v-if="issues.email" class="adm-note adm-danger">{{ issues.email }}</span>
              </div>
            </fieldset>
          </section>

          <section class="adm-panel" aria-labelledby="p-history">
            <div class="adm-panel__head">
              <h2 id="p-history" class="adm-panel__title">История</h2>
              <p class="adm-panel__hint">Сначала новые</p>
            </div>
            <ol class="adm-history">
              <li
                v-for="h in request.history"
                :key="h.id"
                :class="{ 'is-key': h.kind === 'created' || h.kind === 'status' }"
              >
                <time :datetime="h.at">{{ momentLabel(new Date(h.at)) }}</time>
                <p>
                  <template v-if="h.kind === 'status'">
                    Статус: {{ value(h.changes[0]!, 'from') }} →
                    <b>{{ value(h.changes[0]!, 'to') }}</b>
                  </template>
                  <template v-else-if="h.kind === 'changed'">
                    <template v-for="(c, i) in h.changes" :key="c.field">
                      {{ i ? ', ' : '' }}
                      <template v-if="c.field === 'staffNote'"
                        >{{ i ? 'заметка' : 'Заметка' }} изменена</template
                      >
                      <template v-else>
                        {{
                          i ? requestFieldNames[c.field]?.toLowerCase() : requestFieldNames[c.field]
                        }}
                        <del>{{ value(c, 'from') }}</del> → <ins>{{ value(c, 'to') }}</ins>
                      </template>
                    </template>
                  </template>
                  <template v-else>{{ historyText(h) }}</template>
                  <small
                    v-if="h.kind !== 'notified' && (h.userName || h.note || h.kind === 'created')"
                  >
                    {{
                      [
                        h.userName,
                        h.note,
                        h.kind === 'created' && request.source === 'site'
                          ? `${localeNames[request.locale]} версия`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    }}
                  </small>
                </p>
              </li>
            </ol>
          </section>
        </div>

        <aside class="adm-stack" aria-label="Статус и сведения">
          <section class="adm-panel" aria-labelledby="p-status">
            <h2 id="p-status" class="adm-panel__title" style="margin-bottom: 14px">Статус</h2>
            <div class="adm-seg" role="group" aria-labelledby="p-status">
              <button
                v-for="s in requestStatuses"
                :key="s"
                :class="segClass[s]"
                type="button"
                :aria-pressed="form.status === s"
                :disabled="!canEdit"
                @click="form.status = s"
              >
                {{ requestStatusNames[s] }}
              </button>
            </div>
            <div v-if="canEdit" class="field" style="margin-top: 14px">
              <label for="s-note">Пояснение для истории</label>
              <input
                id="s-note"
                v-model="form.note"
                type="text"
                maxlength="300"
                placeholder="например, по звонку гостя"
              />
            </div>
            <div class="adm-actions">
              <button v-if="canEdit" class="btn btn--solid" type="submit" :disabled="saving">
                {{ saving ? 'Сохраняем…' : 'Сохранить' }}
              </button>
              <a class="btn btn--sm" :href="`tel:${request.phone.replace(/[^+\d]/g, '')}`">
                Позвонить
              </a>
            </div>
            <p v-if="!canEdit" class="adm-note" style="margin-top: 10px">
              У вас доступ только на просмотр.
            </p>
          </section>

          <section class="adm-panel" aria-labelledby="p-info">
            <h2 id="p-info" class="adm-panel__title" style="margin-bottom: 14px">Сведения</h2>
            <dl class="adm-facts">
              <div v-if="request.lead">
                <dt>Контакт в лидах</dt>
                <dd>
                  <NuxtLink v-if="can('leads')" :to="`/admin/leads/${request.lead.id}`">
                    {{ request.lead.name }}
                  </NuxtLink>
                  <template v-else>{{ request.lead.name }}</template>
                  ·
                  {{
                    request.lead.events > 1
                      ? `${request.lead.events} ${plural(request.lead.events, ['обращение', 'обращения', 'обращений'])} с ${fullDate(request.lead.since.slice(0, 10))}`
                      : 'новый контакт'
                  }}
                  <br />
                  <span v-for="t in request.lead.tags" :key="t" class="adm-tag">{{ t }}</span>
                </dd>
              </div>
              <div>
                <dt>Рассылка</dt>
                <dd>
                  {{
                    request.marketingOptIn
                      ? `Согласие дано в заявке, ${momentLabel(new Date(request.createdAt))}`
                      : 'Не подписан(а)'
                  }}
                </dd>
              </div>
              <div>
                <dt>Согласие на обработку данных</dt>
                <dd>
                  <template v-if="request.consentAt">
                    {{ momentLabel(new Date(request.consentAt)) }} · политика конфиденциальности,
                    версия {{ request.policyVersion }}
                  </template>
                  <template v-else>Нет — заявка внесена вручную</template>
                </dd>
              </div>
              <div>
                <dt>Источник</dt>
                <dd>{{ source }}</dd>
              </div>
              <div>
                <dt>Номер</dt>
                <dd>№ {{ request.id }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </form>
  </div>
</template>
