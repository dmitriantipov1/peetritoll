<script setup lang="ts">
// Запрос группы (group.html прототипа): одним блоком — без шагов и слова «Контакты», e-mail
// в ряд с телефоном (просьба заказчицы 12.11.2026). Дата и время необязательны: группы часто
// сами не знают. Обед — из карточек выше или «обсудим по телефону». Минимум человек и срок
// заказа — из настроек; сервер проверяет их ещё раз. Заявка — в «Заявки» (вид «Группа»).
import type { SiteGroup } from '#shared/site-group'
import { groupLeadOk } from '#shared/group-menus'
import { todayInTallinn } from '#shared/dates'
import { formatPrice } from '#shared/money'

const props = defineProps<{ group: SiteGroup }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const form = reactive({
  visitDate: '',
  visitTime: '',
  guests: props.group.minPeople,
  menuId: props.group.menus[0]?.id ?? (null as number | null),
  agency: '',
  name: '',
  phone: '',
  email: '',
  comment: '',
  consent: false,
  website: '',
})

const minDate = ref(todayInTallinn())
onMounted(() => (minDate.value = todayInTallinn()))

// Подсказка сразу, не дожидаясь сервера
const tooFew = computed(() => form.guests < props.group.minPeople)
const tooLate = computed(
  () => !groupLeadOk(form.visitDate || null, form.visitTime || null, props.group.leadHours),
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
        type: 'group',
        locale: locale.value,
        visitDate: form.visitDate || null,
        visitTime: form.visitTime || null,
        guests: form.guests,
        menuId: form.menuId,
        agency: form.agency,
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
    error.value = apiErrorMessage(e, t('group.form.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div id="zayavka">
    <form v-if="doneId === null" class="bq-form" novalidate @submit.prevent="submit">
      <h3 class="bq-step">{{ t('group.form.title') }}</h3>
      <div class="calc-top bq-top bq-one">
        <div class="field">
          <label for="g-date"
            >{{ t('group.form.date') }}
            <span class="field__opt">{{ t('group.form.ifKnown') }}</span></label
          >
          <input id="g-date" v-model="form.visitDate" type="date" :min="minDate" />
        </div>
        <div class="field">
          <label for="g-time"
            >{{ t('group.form.time') }}
            <span class="field__opt">{{ t('group.form.ifKnown') }}</span></label
          >
          <input id="g-time" v-model="form.visitTime" type="time" step="900" />
        </div>
        <div class="field">
          <label for="g-ppl">{{ t('group.form.people') }}</label>
          <input
            id="g-ppl"
            v-model.number="form.guests"
            type="number"
            :min="group.minPeople"
            max="500"
          />
        </div>
        <div class="field">
          <label for="g-menu">{{ t('group.form.menu') }}</label>
          <select id="g-menu" v-model="form.menuId">
            <option v-for="m in group.menus" :key="m.id" :value="m.id">
              {{
                t('group.form.menuOption', {
                  n: m.number,
                  name: m.name,
                  price: formatPrice(m.priceCents),
                })
              }}
            </option>
            <option :value="null">{{ t('group.form.notChosen') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="g-agency">{{ t('group.form.agency') }}</label>
          <input
            id="g-agency"
            v-model.trim="form.agency"
            type="text"
            maxlength="200"
            :placeholder="t('group.form.agencyHint')"
          />
        </div>
        <div class="field">
          <label for="g-person">{{ t('group.form.name') }}</label>
          <input id="g-person" v-model.trim="form.name" type="text" autocomplete="name" />
          <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
        </div>
        <div class="field">
          <label for="g-phone">{{ t('group.form.phone') }}</label>
          <input id="g-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" />
          <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
        </div>
        <div class="field">
          <label for="g-mail">{{ t('group.form.email') }}</label>
          <input id="g-mail" v-model.trim="form.email" type="email" autocomplete="email" />
          <span v-if="issues.email" class="form__error">{{ issues.email }}</span>
        </div>
        <p v-if="tooFew" class="form__full form__error">
          {{ t('group.form.tooFew', { n: group.minPeople }) }}
        </p>
        <p v-else-if="tooLate" class="form__full form__error">
          {{ t('group.form.tooLate', { n: group.leadHours }) }}
        </p>
        <div class="field form__full">
          <label for="g-msg">{{ t('group.form.comment') }}</label>
          <textarea
            id="g-msg"
            v-model="form.comment"
            rows="2"
            maxlength="2000"
            :placeholder="t('group.form.commentHint')"
          />
        </div>
        <!-- Ловушка для роботов: людям не видна, заполненная — заявку не заводим -->
        <div class="visually-hidden" aria-hidden="true">
          <label for="g-website">Website</label>
          <input
            id="g-website"
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
            :disabled="sending || !form.consent || tooFew || tooLate"
          >
            {{ sending ? t('lunch.order.sending') : t('group.form.send') }}
          </button>
          <p class="form__note">{{ t('group.form.note') }}</p>
        </div>
        <p v-if="error" class="form__full form__error" role="alert">{{ error }}</p>
      </div>
    </form>

    <div v-else ref="done" class="bq-done" tabindex="-1">
      <p class="quote">{{ t('group.form.doneTitle') }}</p>
      <h3 class="intro__title">{{ t('group.form.doneLead') }}</h3>
      <p>{{ t('group.form.doneText', { id: doneId }) }}</p>
      <div class="bq-done__actions">
        <NuxtLink class="btn" :to="localePath('/restaurant')">{{
          t('group.form.toRestaurant')
        }}</NuxtLink>
        <button class="btn btn--red" type="button" @click="doneId = null">
          {{ t('group.form.again') }}
        </button>
      </div>
    </div>
  </div>
</template>
