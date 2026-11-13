<script setup lang="ts">
// «05 Забронировать стол» (restaurant.html прототипа, вариант 2 «карточка-форма», 7.1).
// Имя, телефон, e-mail (необязательно), дата, время, гостей, повод, пожелания, согласие.
// Время — по часам работы и особым дням из «Контактов и часов»: каждые полчаса, последняя бронь
// за N минут до закрытия, онлайн — не раньше чем через N часов (shared/table-booking.ts,
// сервер проверяет ещё раз). От N гостей — это банкет: форма отправляет на его страницу.
// Это заявка: стол закреплён, когда персонал подтвердит по телефону.
import type { SiteRestaurant } from '#shared/site-restaurant'
import { addDays, todayInTallinn } from '#shared/dates'
import { tableOccasions } from '#shared/requests'
import { phoneDigits } from '#shared/site-contacts'
import { bookingTimes, isBanquetSize } from '#shared/table-booking'

const props = defineProps<{
  num: string
  rules: NonNullable<SiteRestaurant['booking']>
  serverNow: string
  hours: string
  banquetLink: boolean
  groupLink: boolean
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data: contacts } = await useSiteContacts()

// «Сейчас» — сначала серверное (разметка сервера и браузера совпадает), потом раз в минуту своё
const now = ref(new Date(props.serverNow))
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = new Date()
  timer = setInterval(() => (now.value = new Date()), 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

const today = computed(() => todayInTallinn(now.value))

/** Ближайший день, на который ещё можно забронировать (ищем на две недели вперёд) */
function firstOpenDay() {
  for (let i = 0; i < 14; i++) {
    const d = addDays(today.value, i)
    if (bookingTimes(d, props.rules, now.value).length) return d
  }
  return today.value
}

const form = reactive({
  visitDate: firstOpenDay(),
  visitTime: '',
  guests: 2,
  occasion: 'dinner' as (typeof tableOccasions)[number],
  name: '',
  phone: '',
  email: '',
  comment: '',
  consent: false,
  website: '',
})

const times = computed(() =>
  form.visitDate ? bookingTimes(form.visitDate, props.rules, now.value) : [],
)
// Выбранное время пропало (другой день, прошло) — берём первое доступное
watch(
  times,
  (list) => {
    if (!list.includes(form.visitTime)) form.visitTime = list[0] ?? ''
  },
  { immediate: true },
)
const banquet = computed(() => isBanquetSize(form.guests, props.rules))

const sending = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})
const doneId = ref<number | null>(null)
const done = ref<HTMLElement | null>(null)

async function submit() {
  error.value = ''
  issues.value = {}
  sending.value = true
  try {
    const res = await $fetch<{ id: number }>('/api/site/requests', {
      method: 'POST',
      body: { type: 'table', locale: locale.value, ...form },
    })
    doneId.value = res.id
    await nextTick()
    done.value?.focus()
  } catch (e) {
    error.value = apiErrorMessage(e, t('booking.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section id="bron" class="section section--bg2">
    <div class="container">
      <SectionHead :num="num" :crumb="t('booking.crumb')" :title="t('booking.title')" />

      <div class="story">
        <div class="story__text">
          <h3 class="intro__title">{{ t('booking.lead') }}</h3>
          <p>{{ t('booking.text') }}</p>
          <dl class="facts">
            <div v-if="hours" class="facts__row">
              <dt>{{ t('restaurant.menu.hours') }}</dt>
              <dd>{{ hours }}</dd>
            </div>
            <div v-if="contacts?.phone" class="facts__row">
              <dt>{{ t('contacts.phone') }}</dt>
              <dd>
                <a :href="`tel:${phoneDigits(contacts.phone)}`">{{ contacts.phone }}</a>
              </dd>
            </div>
            <div v-if="banquetLink" class="facts__row">
              <dt>{{ t('booking.party') }}</dt>
              <dd>
                {{ t('booking.partyText') }}
                <NuxtLink :to="localePath('/banquet')">{{ t('booking.partyLink') }}</NuxtLink>
              </dd>
            </div>
            <div v-if="groupLink" class="facts__row">
              <dt>{{ t('booking.group') }}</dt>
              <dd>
                {{ t('booking.groupText') }}
                <NuxtLink :to="localePath('/group')">{{ t('booking.groupLink') }}</NuxtLink>
              </dd>
            </div>
          </dl>
        </div>

        <div class="story__media">
          <div class="bk-card">
            <h3 class="bk-card__title">{{ t('booking.title') }}</h3>
            <form v-if="doneId === null" class="form" novalidate @submit.prevent="submit">
              <div class="field">
                <label for="t-name">{{ t('events.form.name') }}</label>
                <input id="t-name" v-model.trim="form.name" type="text" autocomplete="name" />
                <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
              </div>
              <div class="field">
                <label for="t-phone">{{ t('events.form.phone') }}</label>
                <input id="t-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" />
                <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
              </div>
              <div class="field">
                <label for="t-date">{{ t('booking.date') }}</label>
                <input id="t-date" v-model="form.visitDate" type="date" :min="today" />
              </div>
              <div class="field">
                <label for="t-time">{{ t('booking.time') }}</label>
                <select id="t-time" v-model="form.visitTime" :disabled="!times.length">
                  <option v-for="tm in times" :key="tm" :value="tm">{{ tm }}</option>
                  <option v-if="!times.length" value="">{{ t('booking.noTime') }}</option>
                </select>
                <span v-if="issues.visitTime" class="form__error">{{ issues.visitTime }}</span>
              </div>
              <p v-if="!times.length" class="form__full form__error">
                {{ t('booking.noTimeText') }}
              </p>
              <div class="field">
                <label for="t-ppl">{{ t('booking.guests') }}</label>
                <input id="t-ppl" v-model.number="form.guests" type="number" min="1" max="500" />
                <span v-if="issues.guests" class="form__error">{{ issues.guests }}</span>
              </div>
              <div class="field">
                <label for="t-occ">{{ t('booking.occasion') }}</label>
                <select id="t-occ" v-model="form.occasion">
                  <option v-for="o in tableOccasions" :key="o" :value="o">
                    {{ t(`booking.occasions.${o}`) }}
                  </option>
                </select>
              </div>
              <p v-if="banquet" class="form__full form__error">
                {{ t('booking.banquet', { n: rules.banquetFromGuests }) }}
                <NuxtLink v-if="banquetLink" :to="localePath('/banquet')">{{
                  t('booking.banquetLink')
                }}</NuxtLink>
              </p>
              <div class="field form__full">
                <label for="t-mail">{{ t('events.form.email') }}</label>
                <input id="t-mail" v-model.trim="form.email" type="email" autocomplete="email" />
                <span v-if="issues.email" class="form__error">{{ issues.email }}</span>
              </div>
              <div class="field form__full">
                <label for="t-msg">{{ t('booking.wishes') }}</label>
                <textarea
                  id="t-msg"
                  v-model="form.comment"
                  rows="3"
                  maxlength="2000"
                  :placeholder="t('booking.wishesHint')"
                />
              </div>
              <!-- Ловушка для роботов: людям не видна, заполненная — заявку не заводим -->
              <div class="visually-hidden" aria-hidden="true">
                <label for="t-website">Website</label>
                <input
                  id="t-website"
                  v-model="form.website"
                  type="text"
                  tabindex="-1"
                  autocomplete="off"
                />
              </div>
              <label class="form__check form__full">
                <input v-model="form.consent" type="checkbox" />
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
                  :disabled="sending || !form.consent || !form.visitTime || banquet"
                >
                  {{ sending ? t('lunch.order.sending') : t('booking.send') }}
                </button>
                <p class="form__note">{{ t('booking.note') }}</p>
              </div>
              <p
                v-if="error && !Object.keys(issues).length"
                class="form__full form__error"
                role="alert"
              >
                {{ error }}
              </p>
            </form>

            <div v-else ref="done" class="bk-done" tabindex="-1">
              <p class="quote">{{ t('booking.doneTitle') }}</p>
              <p>{{ t('booking.doneText', { id: doneId }) }}</p>
              <p>
                <button class="btn btn--sm" type="button" @click="doneId = null">
                  {{ t('booking.again') }}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
