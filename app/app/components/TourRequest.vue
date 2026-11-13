<script setup lang="ts">
// Заявка «Экскурсия» на странице «Экскурсии и поездки» (services.html прототипа, раздел
// «Оставить заявку»; 7.2): имя, телефон, e-mail (необязательно), дата, сколько человек,
// что интересует, комментарий, согласие. Тема приходит и с кнопок «Заказать» выше (v-model).
// Pakri Express в списке — только если раздел включён; сервер проверяет ещё раз.
import { tourTopics, type TourTopic } from '#shared/requests'
import { todayInTallinn } from '#shared/dates'

const props = defineProps<{ pakri: boolean }>()
const topic = defineModel<TourTopic>('topic', { required: true })

const { t, locale } = useI18n()
const localePath = useLocalePath()

const topics = computed(() => tourTopics.filter((x) => x !== 'pakri' || props.pakri))

const minDate = ref(todayInTallinn())
onMounted(() => (minDate.value = todayInTallinn()))

const form = reactive({
  visitDate: '',
  guests: 2,
  name: '',
  phone: '',
  email: '',
  comment: '',
  consent: false,
  website: '',
})

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
      body: { type: 'tour', locale: locale.value, topic: topic.value, ...form },
    })
    doneId.value = res.id
    await nextTick()
    done.value?.focus()
  } catch (e) {
    error.value = apiErrorMessage(e, t('services.form.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form v-if="doneId === null" class="form" novalidate @submit.prevent="submit">
    <div class="field">
      <label for="f-name">{{ t('events.form.name') }}</label>
      <input id="f-name" v-model.trim="form.name" type="text" autocomplete="name" />
      <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
    </div>
    <div class="field">
      <label for="f-phone">{{ t('events.form.phone') }}</label>
      <input id="f-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" />
      <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
    </div>
    <div class="field">
      <label for="f-date">{{ t('booking.date') }}</label>
      <input id="f-date" v-model="form.visitDate" type="date" :min="minDate" />
      <span v-if="issues.visitDate" class="form__error">{{ issues.visitDate }}</span>
    </div>
    <div class="field">
      <label for="f-people">{{ t('services.form.people') }}</label>
      <input id="f-people" v-model.number="form.guests" type="number" min="1" max="500" />
      <span v-if="issues.guests" class="form__error">{{ issues.guests }}</span>
    </div>
    <div class="field form__full">
      <label for="f-type">{{ t('services.form.topic') }}</label>
      <select id="f-type" v-model="topic">
        <option v-for="x in topics" :key="x" :value="x">{{ t(`services.topics.${x}`) }}</option>
      </select>
      <span v-if="issues.topic" class="form__error">{{ issues.topic }}</span>
    </div>
    <div class="field form__full">
      <label for="f-mail">{{ t('events.form.email') }}</label>
      <input id="f-mail" v-model.trim="form.email" type="email" autocomplete="email" />
      <span v-if="issues.email" class="form__error">{{ issues.email }}</span>
    </div>
    <div class="field form__full">
      <label for="f-msg">{{ t('events.form.comment') }}</label>
      <textarea
        id="f-msg"
        v-model="form.comment"
        maxlength="2000"
        :placeholder="t('services.form.commentHint')"
      />
    </div>
    <!-- Ловушка для роботов: людям не видна, заполненная — заявку не заводим -->
    <div class="visually-hidden" aria-hidden="true">
      <label for="f-website">Website</label>
      <input id="f-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
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
    <div class="form__full">
      <button
        class="btn btn--red"
        type="submit"
        :disabled="sending || !form.consent || !form.visitDate"
      >
        {{ sending ? t('lunch.order.sending') : t('services.form.send') }}
      </button>
    </div>
    <p v-if="error && !Object.keys(issues).length" class="form__full form__error" role="alert">
      {{ error }}
    </p>
  </form>

  <div v-else ref="done" class="bq-done" tabindex="-1">
    <p class="quote">{{ t('services.form.doneTitle') }}</p>
    <p>{{ t('services.form.doneText', { id: doneId }) }}</p>
    <div class="bq-done__actions">
      <button class="btn" type="button" @click="doneId = null">
        {{ t('services.form.again') }}
      </button>
    </div>
  </div>
</template>
