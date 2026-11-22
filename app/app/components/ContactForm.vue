<script setup lang="ts">
// «Написать нам» (contacts.html прототипа, раздел 04): имя, телефон и e-mail — отдельными полями,
// нужно хотя бы одно (заказчица, 22.11.2026),
// сообщение, согласие. Не заявка — письмо сотрудникам и Telegram (server/api/site/message.post.ts).
const { t, locale } = useI18n()
const localePath = useLocalePath()

const form = reactive({
  name: '',
  phone: '',
  email: '',
  message: '',
  consent: false,
  website: '',
})

const sending = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})
const sent = ref(false)
const done = ref<HTMLElement | null>(null)
const formEl = ref<HTMLFormElement | null>(null)
const fc = useFormCheck(formEl, issues)

async function submit() {
  if (!fc.check()) return
  error.value = ''
  issues.value = {}
  sending.value = true
  try {
    await $fetch('/api/site/message', {
      method: 'POST',
      body: { ...form, locale: locale.value },
    })
    sent.value = true
    fc.reset()
    Object.assign(form, { name: '', phone: '', email: '', message: '', consent: false })
    await nextTick()
    done.value?.focus()
  } catch (e) {
    error.value = apiErrorMessage(e, t('contacts.form.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form v-if="!sent" ref="formEl" class="form" novalidate @submit.prevent="submit">
    <!-- Имя во всю ширину, телефон и e-mail — парой (22.11.2026) -->
    <div class="field form__full">
      <label for="c-name">{{ t('contacts.form.name') }}</label>
      <input
        id="c-name"
        v-model.trim="form.name"
        name="name"
        type="text"
        autocomplete="name"
        maxlength="100"
        required
      />
      <FieldError id="c-name-err" :msg="fc.error('name')" />
    </div>
    <div class="field">
      <label for="c-phone">{{ t('contacts.form.phone') }}</label>
      <input
        id="c-phone"
        v-model.trim="form.phone"
        name="phone"
        type="tel"
        autocomplete="tel"
        maxlength="40"
        data-check="phone"
        data-one-of="contact"
      />
      <FieldError id="c-phone-err" :msg="fc.error('phone')" />
    </div>
    <div class="field">
      <label for="c-mail">{{ t('contacts.form.email') }}</label>
      <input
        id="c-mail"
        v-model.trim="form.email"
        name="email"
        type="email"
        autocomplete="email"
        maxlength="200"
        data-one-of="contact"
      />
      <FieldError id="c-mail-err" :msg="fc.error('email')" />
    </div>
    <div class="field form__full">
      <label for="c-msg">{{ t('contacts.form.message') }}</label>
      <textarea id="c-msg" v-model="form.message" name="message" maxlength="3000" required />
      <FieldError id="c-msg-err" :msg="fc.error('message')" />
    </div>
    <!-- Ловушка для роботов: людям не видна, заполненная — сообщение не отправляем -->
    <div class="visually-hidden" aria-hidden="true">
      <label for="c-website">Website</label>
      <input id="c-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
    </div>
    <label class="form__check form__full">
      <input id="c-consent" v-model="form.consent" name="consent" type="checkbox" required />
      <span
        >{{ t('lunch.order.consent') }}
        <NuxtLink :to="localePath('/privacy')" target="_blank">{{
          t('lunch.order.policy')
        }}</NuxtLink></span
      >
    </label>
    <FieldError id="c-consent-err" :msg="fc.error('consent')" />
    <div class="form__full">
      <button class="btn btn--red" type="submit" :disabled="sending">
        {{ sending ? t('lunch.order.sending') : t('contacts.form.send') }}
      </button>
    </div>
    <!-- Ошибка поля уже видна под полем — общую строку показываем, только если полей нет -->
    <p v-if="error && !Object.keys(issues).length" class="form__full form__error" role="alert">
      {{ error }}
    </p>
  </form>

  <div v-else ref="done" class="bq-done" tabindex="-1">
    <p class="quote">{{ t('contacts.form.doneTitle') }}</p>
    <p>{{ t('contacts.form.doneText') }}</p>
    <div class="bq-done__actions">
      <button class="btn" type="button" @click="sent = false">
        {{ t('contacts.form.again') }}
      </button>
    </div>
  </div>
</template>
