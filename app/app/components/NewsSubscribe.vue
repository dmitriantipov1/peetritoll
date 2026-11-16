<script setup lang="ts">
// Подписка на рассылку (news.html прототипа, раздел «Подписка»; 8.2, double opt-in):
// почта и согласие отдельной галочкой (8.1) → письмо со ссылкой → подписка после подтверждения.
// Ответ один для любого адреса: «проверьте почту».
const { t, locale } = useI18n()
const localePath = useLocalePath()

const email = ref('')
const consent = ref(false)
const website = ref('')
const sending = ref(false)
const error = ref('')
const sentTo = ref('')
const issues = ref<Record<string, string>>({})
const formEl = ref<HTMLFormElement | null>(null)
const fc = useFormCheck(formEl, issues)

async function submit() {
  if (!fc.check()) return
  error.value = ''
  issues.value = {}
  sending.value = true
  try {
    await $fetch('/api/site/subscribe', {
      method: 'POST',
      body: {
        email: email.value,
        consent: consent.value,
        website: website.value,
        locale: locale.value,
      },
    })
    sentTo.value = email.value
    fc.reset()
    email.value = ''
    consent.value = false
  } catch (e) {
    error.value = apiErrorMessage(e, t('news.sub.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section id="podpiska" class="section section--bg2">
    <div class="container">
      <div class="cta-row">
        <p class="quote">
          {{ t('news.sub.quote1') }}<br /><span class="quote__indent">{{
            t('news.sub.quote2')
          }}</span>
        </p>
        <p v-if="sentTo" class="news-sub__done" role="status">
          {{ t('news.sub.done', { email: sentTo }) }}
        </p>
        <form
          v-else
          id="news-sub-form"
          ref="formEl"
          class="news-sub"
          novalidate
          @submit.prevent="submit"
        >
          <label class="vh" for="sub-mail">E-mail</label>
          <input
            id="sub-mail"
            v-model.trim="email"
            type="email"
            :placeholder="t('news.sub.placeholder')"
            name="email"
            autocomplete="email"
            maxlength="200"
            required
          />
          <button class="btn btn--red" type="submit" :disabled="sending">
            {{ sending ? t('lunch.order.sending') : t('news.sub.send') }}
          </button>
          <FieldError id="sub-mail-err" :msg="fc.error('email')" />
          <!-- Ловушка для роботов: людям не видна -->
          <div class="visually-hidden" aria-hidden="true">
            <label for="sub-website">Website</label>
            <input
              id="sub-website"
              v-model="website"
              type="text"
              tabindex="-1"
              autocomplete="off"
            />
          </div>
        </form>
      </div>
      <template v-if="!sentTo">
        <!-- Галочка вне <form> по раскладке, но в форме по атрибуту form — проверяется вместе с ней -->
        <label class="form__check news-sub__check">
          <input
            id="sub-consent"
            v-model="consent"
            form="news-sub-form"
            name="consent"
            type="checkbox"
            required
          />
          <span
            >{{ t('lunch.order.consent') }}
            <NuxtLink :to="localePath('/privacy')" target="_blank">{{
              t('lunch.order.policy')
            }}</NuxtLink></span
          >
        </label>
        <FieldError id="sub-consent-err" :msg="fc.error('consent')" />
        <p class="form__note">{{ t('news.sub.note') }}</p>
        <p v-if="error && !Object.keys(issues).length" class="form__error" role="alert">
          {{ error }}
        </p>
      </template>
    </div>
  </section>
</template>
