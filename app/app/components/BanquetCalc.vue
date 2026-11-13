<script setup lang="ts">
// Калькулятор банкета (banquet.html прототипа, раздел 03; 7.1): 1 — мероприятие (дата, время,
// гости, повод), 2 — банкетное меню: сеты, блюда со счётчиками, «Ваш выбор» с суммой.
// Количество — в единицах блюда (порция, кг, шт.…): сет и «заполнить по числу гостей» ставят
// гости ÷ «хватает на» с округлением вверх (shared/catalog.ts, 13.11.2026).
// Сет отмечен, пока совпадает состав; количество не в счёт. Сумма — ориентировочная, не оферта.
// 3 — контакты и согласие; отправка — заявка «Банкет» с расчётом снимком цен (письмо с Excel,
// Telegram). Сервер проверяет вместимость, срок и блюда ещё раз. Это запрос, а не бронь.
import type { SiteBanquet, SiteBanquetDish, SiteBanquetSet } from '#shared/site-banquet'
import { banquetOccasions } from '#shared/requests'
import { banquetShortfall, catalogUnitPer, catalogUnitShort, unitsForGuests } from '#shared/catalog'
import { addDays } from '#shared/dates'
import { formatPrice } from '#shared/money'
import type { ContentLocale } from '#shared/locales'

const props = defineProps<{ banquet: SiteBanquet }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const lang = computed(() => locale.value as ContentLocale)

const minDate = computed(() => addDays(props.banquet.today, props.banquet.leadDays))

const form = reactive({
  visitDate: minDate.value,
  visitTime: '18:00',
  guests: Math.max(props.banquet.capacityMin, Math.min(20, props.banquet.capacityMax)),
  occasion: banquetOccasions[0] as (typeof banquetOccasions)[number],
})

// ---------- Порции ----------

const qty = reactive<Record<number, number>>({})
const dishes = computed(() => props.banquet.categories.flatMap((c) => c.dishes))
const categoryOf = computed(
  () => new Map(props.banquet.categories.flatMap((c) => c.dishes.map((d) => [d.id, c.id]))),
)
const q = (d: SiteBanquetDish) => qty[d.id] ?? 0
function setQty(d: SiteBanquetDish, n: number) {
  qty[d.id] = Math.max(0, Math.min(1000, Math.round(Number(n) || 0)))
}

const picked = computed(() => dishes.value.filter((d) => q(d) > 0))
const total = computed(() => picked.value.reduce((sum, d) => sum + q(d) * d.priceCents, 0))
const perGuest = computed(() => (form.guests > 0 ? Math.round(total.value / form.guests) : 0))

const pickedKey = computed(() =>
  picked.value
    .map((d) => d.id)
    .sort((a, b) => a - b)
    .join(','),
)
const isActive = (set: SiteBanquetSet) =>
  [...set.dishIds].sort((a, b) => a - b).join(',') === pickedKey.value

function applySet(set: SiteBanquetSet) {
  for (const d of dishes.value) {
    setQty(d, set.dishIds.includes(d.id) ? unitsForGuests(form.guests, d.servesGuests) : 0)
  }
}
function fillByGuests() {
  for (const d of picked.value) setQty(d, unitsForGuests(form.guests, d.servesGuests))
}
function reset() {
  for (const d of dishes.value) setQty(d, 0)
}

const shortfall = computed(() =>
  banquetShortfall(
    dishes.value.map((d) => ({
      qty: q(d),
      servesGuests: d.servesGuests,
      categoryId: categoryOf.value.get(d.id)!,
    })),
    form.guests,
    props.banquet,
  ),
)
const warnCategory = computed(
  () => props.banquet.categories.find((c) => c.id === props.banquet.warnCategoryId)?.name ?? '',
)

// ---------- Подписи ----------

/** «6,50 € за порцию», «12,00 € за кг · на 10 гостей» */
function priceLine(d: SiteBanquetDish) {
  const line = t('banquet.calc.perUnit', {
    price: formatPrice(d.priceCents),
    unit: catalogUnitPer[d.unit][lang.value],
  })
  return d.servesGuests > 1 ? `${line} · ${t('banquet.calc.serves', { n: d.servesGuests })}` : line
}
const amount = (d: SiteBanquetDish) => `${q(d)} ${catalogUnitShort[d.unit][lang.value]}`
const setList = (set: SiteBanquetSet) =>
  set.dishIds
    .map((id) => dishes.value.find((d) => d.id === id)?.name)
    .filter(Boolean)
    .join(', ')

// ---------- Отправка ----------

const contact = reactive({
  name: '',
  phone: '',
  email: '',
  comment: '',
  consent: false,
  website: '',
})
const outOfRange = computed(
  () => form.guests < props.banquet.capacityMin || form.guests > props.banquet.capacityMax,
)
const sending = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})
const doneId = ref<number | null>(null)
const done = ref<HTMLElement | null>(null)

/** С какого сета начали — если состав совпадает */
const setTier = computed(() => props.banquet.sets.find(isActive)?.tier ?? null)

async function submit() {
  error.value = ''
  issues.value = {}
  sending.value = true
  try {
    const res = await $fetch<{ id: number }>('/api/site/requests', {
      method: 'POST',
      body: {
        type: 'banquet',
        locale: locale.value,
        ...form,
        setTier: setTier.value,
        items: picked.value.map((d) => ({ dishId: d.id, qty: q(d) })),
        ...contact,
      },
    })
    doneId.value = res.id
    await nextTick()
    done.value?.focus()
    done.value?.scrollIntoView({ block: 'center' })
  } catch (e) {
    error.value = apiErrorMessage(e, t('banquet.form.failed'))
    issues.value = apiErrorIssues(e)
  } finally {
    sending.value = false
  }
}

function again() {
  doneId.value = null
}
</script>

<template>
  <div>
    <form v-if="doneId === null" class="bq-form" novalidate @submit.prevent="submit">
      <h3 class="bq-step"><span class="bq-step__num">1</span> {{ t('banquet.calc.step1') }}</h3>
      <div class="calc-top bq-top">
        <div class="field">
          <label for="b-date">{{ t('booking.date') }}</label>
          <input id="b-date" v-model="form.visitDate" type="date" :min="minDate" />
        </div>
        <div class="field">
          <label for="b-time">{{ t('booking.time') }}</label>
          <input id="b-time" v-model="form.visitTime" type="time" step="900" />
        </div>
        <div class="field">
          <label for="b-ppl">{{ t('banquet.calc.guests') }}</label>
          <input
            id="b-ppl"
            v-model.number="form.guests"
            type="number"
            :min="banquet.capacityMin"
            :max="banquet.capacityMax"
          />
        </div>
        <div class="field">
          <label for="b-reason">{{ t('booking.occasion') }}</label>
          <select id="b-reason" v-model="form.occasion">
            <option v-for="o in banquetOccasions" :key="o" :value="o">
              {{ t(`banquet.occasions.${o}`) }}
            </option>
          </select>
        </div>
      </div>
      <p
        v-if="form.guests < banquet.capacityMin || form.guests > banquet.capacityMax"
        class="form__error"
      >
        {{ t('banquet.calc.capacity', { min: banquet.capacityMin, max: banquet.capacityMax }) }}
      </p>

      <h3 class="bq-step"><span class="bq-step__num">2</span> {{ t('banquet.calc.step2') }}</h3>
      <p v-if="!banquet.categories.length" class="events-empty">{{ t('banquet.calc.empty') }}</p>
      <template v-else>
        <div class="calc-presets">
          <div class="calc-presets__head">
            <p class="calc-presets__label">
              {{ banquet.sets.length ? t('banquet.calc.fromSet') : t('banquet.calc.pick') }}
            </p>
            <button
              class="calc-presets__act"
              type="button"
              :disabled="!picked.length"
              @click="fillByGuests"
            >
              {{ t('banquet.calc.fill') }}
            </button>
            <button
              class="calc-presets__act"
              type="button"
              :disabled="!picked.length"
              @click="reset"
            >
              {{ t('banquet.calc.reset') }}
            </button>
          </div>
          <div v-if="banquet.sets.length" class="calc-sets">
            <button
              v-for="set in banquet.sets"
              :key="set.tier"
              class="calc-set"
              :class="{ 'is-active': isActive(set) }"
              type="button"
              :aria-pressed="isActive(set)"
              @click="applySet(set)"
            >
              <span class="calc-set__tier">{{ t(`banquet.tiers.${set.tier}`) }}</span>
              <span v-if="set.name" class="calc-set__name">{{ set.name }}</span>
              <span class="calc-set__list">{{ setList(set) }}</span>
              <span class="calc-set__price"
                ><b>{{ formatPrice(set.pricePerGuestCents) }}</b>
                {{ t('banquet.calc.perPerson') }}</span
              >
            </button>
          </div>
          <p v-if="banquet.sets.length" class="calc-presets__hint">
            {{ t('banquet.calc.setHint') }}
          </p>
          <p v-if="banquet.hint" class="calc-presets__hint">{{ banquet.hint }}</p>
        </div>

        <div class="calc-two">
          <div>
            <div v-for="c in banquet.categories" :key="c.id" class="calc-cat">
              <p class="calc-cat__name">{{ c.name }}</p>
              <div
                v-for="d in c.dishes"
                :key="d.id"
                class="calc-row"
                :class="{ 'is-picked': q(d) > 0 }"
              >
                <div>
                  <p class="calc-row__name">{{ d.name }}</p>
                  <p class="calc-row__price">{{ priceLine(d) }}</p>
                </div>
                <div class="calc-step">
                  <button
                    class="calc-step__btn"
                    type="button"
                    :aria-label="t('banquet.calc.less', { name: d.name })"
                    @click="setQty(d, q(d) - 1)"
                  >
                    −
                  </button>
                  <input
                    class="calc-step__input"
                    type="number"
                    min="0"
                    :value="q(d)"
                    :aria-label="t('banquet.calc.qty', { name: d.name })"
                    @input="setQty(d, Number(($event.target as HTMLInputElement).value))"
                  />
                  <button
                    class="calc-step__btn"
                    type="button"
                    :aria-label="t('banquet.calc.more', { name: d.name })"
                    @click="setQty(d, q(d) + 1)"
                  >
                    +
                  </button>
                </div>
                <p class="calc-row__sum">{{ q(d) ? formatPrice(q(d) * d.priceCents) : '—' }}</p>
              </div>
            </div>
            <p v-if="shortfall !== null" class="calc-warn">
              {{
                t('banquet.calc.warn', {
                  guests: form.guests,
                  category: warnCategory,
                  n: shortfall,
                })
              }}
            </p>
          </div>

          <aside class="calc-side">
            <p class="calc-side__title">{{ t('banquet.calc.chosen') }}</p>
            <ul class="calc-chosen">
              <li v-if="!picked.length" class="calc-chosen__empty">
                {{ t('banquet.calc.nothing') }}
              </li>
              <li v-for="d in picked" :key="d.id">
                <span>{{ d.name }}</span
                ><b>{{ amount(d) }}</b>
              </li>
            </ul>
            <p class="calc-side__total">
              <span>{{ t('banquet.calc.total') }}</span> <span>{{ formatPrice(total) }}</span>
            </p>
            <p class="calc-side__note">
              {{ t('banquet.calc.perGuest') }}:
              {{ form.guests > 0 && total ? formatPrice(perGuest) : '—' }}.
              {{ t('banquet.calc.notOffer') }}
            </p>
            <p class="calc-side__act">
              <a class="btn btn--sm" href="#b-contacts">{{ t('banquet.form.next') }}</a>
            </p>
          </aside>
        </div>
      </template>

      <h3 id="b-contacts" class="bq-step">
        <span class="bq-step__num">3</span> {{ t('banquet.form.step3') }}
      </h3>
      <div class="form bq-contacts">
        <div class="field">
          <label for="b-name">{{ t('events.form.name') }}</label>
          <input id="b-name" v-model.trim="contact.name" type="text" autocomplete="name" />
          <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
        </div>
        <div class="field">
          <label for="b-phone">{{ t('events.form.phone') }}</label>
          <input id="b-phone" v-model.trim="contact.phone" type="tel" autocomplete="tel" />
          <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
        </div>
        <div class="field">
          <label for="b-mail">{{ t('events.form.email') }}</label>
          <input id="b-mail" v-model.trim="contact.email" type="email" autocomplete="email" />
          <span v-if="issues.email" class="form__error">{{ issues.email }}</span>
        </div>
        <div class="field form__full">
          <label for="b-msg">{{ t('events.form.comment') }}</label>
          <textarea
            id="b-msg"
            v-model="contact.comment"
            maxlength="2000"
            :placeholder="t('banquet.form.commentHint')"
          />
        </div>
        <!-- Ловушка для роботов: людям не видна, заполненная — заявку не заводим -->
        <div class="visually-hidden" aria-hidden="true">
          <label for="b-website">Website</label>
          <input
            id="b-website"
            v-model="contact.website"
            type="text"
            tabindex="-1"
            autocomplete="off"
          />
        </div>
        <label class="form__check form__full">
          <input v-model="contact.consent" type="checkbox" />
          <span
            >{{ t('lunch.order.consent') }}
            <NuxtLink :to="localePath('/privacy')" target="_blank">{{
              t('lunch.order.policy')
            }}</NuxtLink></span
          >
        </label>
        <p v-if="issues.visitDate || issues.guests || issues.items" class="form__full form__error">
          {{ issues.visitDate || issues.guests || issues.items }}
        </p>
        <div class="form__full bq-send">
          <button
            class="btn btn--red"
            type="submit"
            :disabled="sending || !contact.consent || outOfRange || form.visitDate < minDate"
          >
            {{ sending ? t('lunch.order.sending') : t('banquet.form.send') }}
          </button>
          <p class="form__note">{{ t('banquet.form.note') }}</p>
        </div>
        <p v-if="error && !Object.keys(issues).length" class="form__full form__error" role="alert">
          {{ error }}
        </p>
      </div>
    </form>

    <div v-else ref="done" class="bq-done" tabindex="-1">
      <p class="quote">{{ t('banquet.form.doneTitle') }}</p>
      <h3 class="intro__title">{{ t('banquet.form.doneLead') }}</h3>
      <p>{{ t('banquet.form.doneText', { id: doneId }) }}</p>
      <div class="bq-done__actions">
        <NuxtLink class="btn" :to="localePath('/menu')">{{ t('banquet.form.toMenu') }}</NuxtLink>
        <button class="btn btn--red" type="button" @click="again">
          {{ t('banquet.form.again') }}
        </button>
      </div>
    </div>
  </div>
</template>
