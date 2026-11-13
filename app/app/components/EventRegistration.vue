<script setup lang="ts">
// «02 Записаться» на странице мероприятия (event.html прототипа, 7.2): запись бесплатная,
// оплата на месте. Имя, телефон, e-mail (необязательно), сколько человек, комментарий, согласие.
// Заявка «Мероприятие» — в «Заявки» и лиды (тег «мероприятие: …»). Лимит мест — из карточки
// мероприятия: форма не даёт записать больше оставшегося, сервер проверяет ещё раз.
import type { SiteEventPage } from '#shared/site-events'
import { phoneDigits } from '#shared/site-contacts'

const props = defineProps<{ event: SiteEventPage; when: string }>()
const emit = defineEmits<{ registered: [] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data: contacts } = await useSiteContacts()

const form = reactive({
  name: '',
  phone: '',
  email: '',
  guests: Math.min(2, props.event.placesLeft ?? 2),
  comment: '',
  consent: false,
  website: '',
})

const full = computed(() => props.event.placesLeft === 0)
const tooMany = computed(
  () => props.event.placesLeft !== null && form.guests > props.event.placesLeft,
)

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
      body: {
        type: 'event',
        materialId: props.event.id,
        locale: locale.value,
        name: form.name,
        phone: form.phone,
        email: form.email,
        guests: form.guests,
        comment: form.comment,
        consent: form.consent,
        website: form.website,
      },
    })
    doneId.value = res.id
    emit('registered')
    await nextTick()
    done.value?.focus()
  } catch (e) {
    error.value = apiErrorMessage(e, t('events.form.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section id="zapis" class="section section--bg2">
    <div class="container">
      <SectionHead num="02" :crumb="t('events.form.crumb')" :title="t('events.form.title')" />

      <div class="story">
        <div class="story__text">
          <h3 class="intro__title">{{ t('events.form.lead') }}</h3>
          <p>{{ t('events.form.text') }}</p>
          <dl class="facts">
            <div class="facts__row">
              <dt>{{ t('events.form.payment') }}</dt>
              <dd>{{ t('events.form.paymentText') }}</dd>
            </div>
            <div v-if="event.placesLeft !== null" class="facts__row">
              <dt>{{ t('events.form.places') }}</dt>
              <dd>{{ full ? t('events.form.noPlaces') : event.placesLeft }}</dd>
            </div>
            <div v-if="contacts?.phone" class="facts__row">
              <dt>{{ t('contacts.phone') }}</dt>
              <dd>
                <a :href="`tel:${phoneDigits(contacts.phone)}`">{{ contacts.phone }}</a>
              </dd>
            </div>
          </dl>
        </div>

        <div class="story__media">
          <div class="bk-card">
            <h3 class="bk-card__title">{{ t('events.form.cardTitle') }}</h3>

            <p v-if="full && doneId === null" class="events-empty">
              {{ t('events.form.fullText') }}
            </p>

            <form v-else-if="doneId === null" class="form" novalidate @submit.prevent="submit">
              <div class="field">
                <label for="r-name">{{ t('events.form.name') }}</label>
                <input id="r-name" v-model.trim="form.name" type="text" autocomplete="name" />
                <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
              </div>
              <div class="field">
                <label for="r-phone">{{ t('events.form.phone') }}</label>
                <input id="r-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" />
                <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
              </div>
              <div class="field">
                <label for="r-mail">{{ t('events.form.email') }}</label>
                <input id="r-mail" v-model.trim="form.email" type="email" autocomplete="email" />
                <span v-if="issues.email" class="form__error">{{ issues.email }}</span>
              </div>
              <div class="field">
                <label for="r-ppl">{{ t('events.form.people') }}</label>
                <input
                  id="r-ppl"
                  v-model.number="form.guests"
                  type="number"
                  min="1"
                  :max="event.placesLeft ?? 500"
                />
                <span v-if="issues.guests" class="form__error">{{ issues.guests }}</span>
                <span v-else-if="tooMany" class="form__error">{{
                  t('events.form.tooMany', { n: event.placesLeft ?? 0 })
                }}</span>
              </div>
              <div class="field form__full">
                <label for="r-msg">{{ t('events.form.comment') }}</label>
                <textarea
                  id="r-msg"
                  v-model="form.comment"
                  rows="3"
                  maxlength="2000"
                  :placeholder="t('events.form.commentHint')"
                />
              </div>
              <!-- Ловушка для роботов: людям не видна, заполненная — заявку не заводим -->
              <div class="visually-hidden" aria-hidden="true">
                <label for="r-website">Website</label>
                <input
                  id="r-website"
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
                  :disabled="sending || !form.consent || tooMany || form.guests < 1"
                >
                  {{ sending ? t('lunch.order.sending') : t('events.form.send') }}
                </button>
                <p class="form__note">{{ t('events.form.note') }}</p>
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
              <p class="quote">{{ t('events.form.doneTitle') }}</p>
              <p>{{ t('events.form.doneText', { when, id: doneId }) }}</p>
              <p>
                <button class="btn btn--sm" type="button" @click="doneId = null">
                  {{ t('events.form.again') }}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
