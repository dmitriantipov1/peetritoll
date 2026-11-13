<script setup lang="ts">
// «Написать нам» (contacts.html прототипа, раздел 04): имя, «телефон или e-mail» одним полем,
// сообщение, согласие. Не заявка — письмо сотрудникам и Telegram (server/api/site/message.post.ts).
const { t, locale } = useI18n()
const localePath = useLocalePath()

const form = reactive({ name: '', contact: '', message: '', consent: false, website: '' })

const sending = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})
const sent = ref(false)
const done = ref<HTMLElement | null>(null)

async function submit() {
  error.value = ''
  issues.value = {}
  sending.value = true
  try {
    await $fetch('/api/site/message', {
      method: 'POST',
      body: { ...form, locale: locale.value },
    })
    sent.value = true
    Object.assign(form, { name: '', contact: '', message: '', consent: false })
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
  <form v-if="!sent" class="form" novalidate @submit.prevent="submit">
    <div class="field">
      <label for="c-name">{{ t('contacts.form.name') }}</label>
      <input id="c-name" v-model.trim="form.name" type="text" autocomplete="name" />
      <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
    </div>
    <div class="field">
      <label for="c-contact">{{ t('contacts.form.contact') }}</label>
      <input id="c-contact" v-model.trim="form.contact" type="text" autocomplete="email" />
      <span v-if="issues.contact" class="form__error">{{ issues.contact }}</span>
    </div>
    <div class="field form__full">
      <label for="c-msg">{{ t('contacts.form.message') }}</label>
      <textarea id="c-msg" v-model="form.message" maxlength="3000" />
      <span v-if="issues.message" class="form__error">{{ issues.message }}</span>
    </div>
    <!-- Ловушка для роботов: людям не видна, заполненная — сообщение не отправляем -->
    <div class="visually-hidden" aria-hidden="true">
      <label for="c-website">Website</label>
      <input id="c-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
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
      <button class="btn btn--red" type="submit" :disabled="sending || !form.consent">
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
