<script setup lang="ts">
// Предзаказ обеда (lunch.html прототипа, раздел 02): день кнопками — только сегодня и завтра,
// суп и горячее со счётчиками, карточка «Ваш предзаказ» с суммой, время, «на месте / с собой»,
// контакты и согласие. Правила дней и времени — shared/lunch.ts, сервер проверяет их ещё раз.
// Заявка уходит в «Заявки» (вид «Обед»), сотрудникам — письмо и Telegram.
import type { SiteLunch } from '#shared/site-lunch'
import { preorderDates, preorderTimes } from '#shared/lunch'
import { timeInTallinn, todayInTallinn } from '#shared/dates'
import { formatPrice } from '#shared/money'

const props = defineProps<{ lunch: SiteLunch }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

// «Сейчас»: на сервере — его часы, в браузере — пересчитываем по часам гостя (страница могла
// пролежать открытой) и раз в минуту, чтобы прошедшее время и закрытый день пропадали сами
const today = ref(props.lunch.today)
const now = ref(props.lunch.now)
let timer: ReturnType<typeof setInterval> | undefined
function tick() {
  today.value = todayInTallinn()
  now.value = timeInTallinn()
}
onMounted(() => {
  tick()
  timer = setInterval(tick, 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

/** Дни, на которые можно заказать сейчас и на которые есть меню */
const days = computed(() =>
  preorderDates(today.value, now.value, props.lunch).flatMap((date) => {
    const d = props.lunch.days.find((x) => x.date === date)
    return d && (d.soup || d.main) ? [d] : []
  }),
)

const form = reactive({
  date: '',
  soup: 0,
  main: 0,
  time: '',
  mode: 'onsite' as 'onsite' | 'pickup',
  name: '',
  phone: '',
  email: '',
  comment: '',
  consent: false,
  website: '',
})

const day = computed(() => days.value.find((d) => d.date === form.date) ?? days.value[0])
const times = computed(() =>
  day.value ? preorderTimes(day.value.date, today.value, now.value, props.lunch) : [],
)

// Выбранный день пропал (наступил крайний срок) — встаём на первый доступный; время — так же
watchEffect(() => {
  if (day.value && form.date !== day.value.date) form.date = day.value.date
  if (!times.value.includes(form.time)) form.time = times.value[0] ?? ''
})
watch(
  () => form.date,
  () => {
    form.soup = 0
    form.main = 0
  },
)

const items = computed(() =>
  day.value
    ? (
        [
          ['soup', day.value.soup],
          ['main', day.value.main],
        ] as const
      ).flatMap(([key, item]) => (item ? [{ key, ...item }] : []))
    : [],
)
const total = computed(() => items.value.reduce((sum, i) => sum + i.priceCents * form[i.key], 0))
const chosen = computed(() => items.value.filter((i) => form[i.key] > 0))

function step(key: 'soup' | 'main', by: number) {
  form[key] = Math.max(0, Math.min(50, form[key] + by))
}

const asDate = (d: string) => new Date(`${d}T00:00:00Z`)
const dayLabel = (d: string) => {
  const s = new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(asDate(d))
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const whenLabel = (d: string) =>
  d === today.value ? t('lunch.order.today') : t('lunch.order.tomorrow')

// ---------- Отправка ----------

const sending = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})
const doneId = ref<number | null>(null)
const done = ref<HTMLElement | null>(null)

async function submit() {
  error.value = ''
  issues.value = {}
  if (!chosen.value.length) {
    error.value = t('lunch.order.pickSomething')
    return
  }
  sending.value = true
  try {
    const res = await $fetch<{ id: number }>('/api/site/requests', {
      method: 'POST',
      body: {
        type: 'lunch',
        locale: locale.value,
        visitDate: form.date,
        visitTime: form.time,
        mode: form.mode,
        items: { soup: form.soup, main: form.main },
        name: form.name,
        phone: form.phone,
        email: form.email,
        comment: form.comment,
        consent: form.consent,
        website: form.website,
      },
    })
    doneId.value = res.id
    await nextTick()
    done.value?.focus()
  } catch (e) {
    error.value = apiErrorMessage(e, t('lunch.order.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}

function again() {
  doneId.value = null
  form.soup = 0
  form.main = 0
  form.comment = ''
}
</script>

<template>
  <section id="predzakaz" class="section section--bg1">
    <div class="container">
      <SectionHead num="02" :crumb="t('lunch.order.crumb')" :title="t('lunch.order.title')" />

      <p v-if="!days.length" class="events-empty">{{ t('lunch.order.closed') }}</p>

      <form v-else-if="doneId === null" class="bq-form" novalidate @submit.prevent="submit">
        <h3 class="bq-step"><span class="bq-step__num">1</span> {{ t('lunch.order.step1') }}</h3>
        <fieldset class="chips lunch-pick">
          <legend class="visually-hidden">{{ t('lunch.order.day') }}</legend>
          <label
            v-for="d in days"
            :key="d.date"
            class="chip"
            :class="{ 'is-active': form.date === d.date }"
          >
            <input v-model="form.date" type="radio" name="l-day" :value="d.date" />{{
              dayLabel(d.date)
            }}<span class="lunch-pick__when">{{ whenLabel(d.date) }}</span>
          </label>
        </fieldset>

        <div class="calc-two">
          <div class="lunch-day">
            <div v-for="i in items" :key="i.key" class="calc-row">
              <div>
                <p class="calc-row__name">{{ i.name }}</p>
                <p class="calc-row__price">
                  {{ t(`lunch.${i.key}`) }} · {{ formatPrice(i.priceCents) }}
                </p>
              </div>
              <div class="calc-step">
                <button
                  class="calc-step__btn"
                  type="button"
                  :aria-label="t('lunch.order.less', { name: i.name })"
                  @click="step(i.key, -1)"
                >
                  −
                </button>
                <input
                  v-model.number="form[i.key]"
                  class="calc-step__input"
                  type="number"
                  min="0"
                  max="50"
                  :aria-label="t('lunch.order.qty', { name: i.name })"
                />
                <button
                  class="calc-step__btn"
                  type="button"
                  :aria-label="t('lunch.order.more', { name: i.name })"
                  @click="step(i.key, 1)"
                >
                  +
                </button>
              </div>
              <p class="calc-row__sum">
                {{ form[i.key] ? formatPrice(i.priceCents * form[i.key]) : '—' }}
              </p>
            </div>
          </div>

          <aside class="calc-side">
            <p class="calc-side__title">{{ t('lunch.order.yours') }}</p>
            <p class="calc-side__day">{{ day ? dayLabel(day.date) : '' }}</p>
            <ul class="calc-chosen">
              <li v-if="!chosen.length" class="calc-chosen__empty">
                {{ t('lunch.order.nothing') }}
              </li>
              <li v-for="i in chosen" :key="i.key">{{ i.name }} × {{ form[i.key] }}</li>
            </ul>
            <p class="calc-side__total">
              <span>{{ t('lunch.order.total') }}</span> <span>{{ formatPrice(total) }}</span>
            </p>
            <p class="calc-side__note">
              {{ t('lunch.order.served', { from: lunch.servedFrom, to: lunch.servedTo }) }}
            </p>
          </aside>
        </div>

        <h3 id="l-contacts" class="bq-step">
          <span class="bq-step__num">2</span> {{ t('lunch.order.step2') }}
        </h3>
        <div class="form bq-contacts">
          <div class="field">
            <label for="l-name">{{ t('lunch.order.name') }}</label>
            <input id="l-name" v-model.trim="form.name" type="text" autocomplete="name" required />
            <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
          </div>
          <div class="field">
            <label for="l-phone">{{ t('lunch.order.phone') }}</label>
            <input id="l-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" required />
            <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
          </div>
          <div class="field">
            <label for="l-email">{{ t('lunch.order.email') }}</label>
            <input id="l-email" v-model.trim="form.email" type="email" autocomplete="email" />
          </div>
          <div class="field">
            <label for="l-time">{{ t('lunch.order.time') }}</label>
            <select id="l-time" v-model="form.time">
              <option v-for="tm in times" :key="tm" :value="tm">{{ tm }}</option>
            </select>
          </div>
          <fieldset class="field bq-how-get">
            <legend>{{ t('lunch.order.how') }}</legend>
            <label
              ><input v-model="form.mode" type="radio" name="l-where" value="onsite" />
              {{ t('lunch.order.onsite') }}</label
            >
            <label
              ><input v-model="form.mode" type="radio" name="l-where" value="pickup" />
              {{ t('lunch.order.pickup') }}</label
            >
          </fieldset>
          <div class="field form__full">
            <label for="l-msg">{{ t('lunch.order.comment') }}</label>
            <textarea
              id="l-msg"
              v-model="form.comment"
              maxlength="2000"
              :placeholder="t('lunch.order.commentHint')"
            />
          </div>
          <!-- Ловушка для роботов: людям не видна, заполненная — заявку не заводим -->
          <div class="visually-hidden" aria-hidden="true">
            <label for="l-website">Website</label>
            <input
              id="l-website"
              v-model="form.website"
              type="text"
              tabindex="-1"
              autocomplete="off"
            />
          </div>
          <label class="form__check form__full">
            <input v-model="form.consent" type="checkbox" required />
            <span
              >{{ t('lunch.order.consent') }}
              <NuxtLink :to="localePath('/privacy')" target="_blank">{{
                t('lunch.order.policy')
              }}</NuxtLink></span
            >
          </label>
          <div class="form__full bq-send">
            <button
              class="btn btn--red"
              type="submit"
              :disabled="sending || !form.consent || !chosen.length"
            >
              {{ sending ? t('lunch.order.sending') : t('lunch.order.send') }}
            </button>
            <p class="form__note">{{ t('lunch.order.note') }}</p>
          </div>
          <p v-if="error" class="form__full form__error" role="alert">{{ error }}</p>
        </div>
      </form>

      <div v-else ref="done" class="bq-done" tabindex="-1">
        <p class="quote">{{ t('lunch.order.doneTitle') }}</p>
        <h3 class="intro__title">{{ t('lunch.order.doneLead') }}</h3>
        <p>{{ t('lunch.order.doneText', { id: doneId }) }}</p>
        <div class="bq-done__actions">
          <NuxtLink class="btn" :to="localePath('/menu')">{{ t('lunch.order.toMenu') }}</NuxtLink>
          <button class="btn btn--red" type="button" @click="again">
            {{ t('lunch.order.again') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
