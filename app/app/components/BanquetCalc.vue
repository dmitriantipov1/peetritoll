<script setup lang="ts">
// Калькулятор банкета (banquet.html прототипа, раздел 03; 7.1): 1 — мероприятие (дата, время,
// гости, повод), 2 — банкетное меню: сеты, блюда со счётчиками, «Ваш выбор» с суммой.
// Количество — в единицах блюда (порция, кг, шт.…): сет и «заполнить по числу гостей» ставят
// гости ÷ «хватает на» с округлением вверх (shared/catalog.ts, 13.11.2026).
// Сет отмечен, пока совпадает состав; количество не в счёт. Сумма — ориентировочная, не оферта.
// Шаг 3 «Контакты» и отправка — следующий слой.
import type { SiteBanquet, SiteBanquetDish, SiteBanquetSet } from '#shared/site-banquet'
import { banquetOccasions } from '#shared/requests'
import { banquetShortfall, catalogUnitPer, catalogUnitShort, unitsForGuests } from '#shared/catalog'
import { addDays } from '#shared/dates'
import { formatPrice } from '#shared/money'
import type { ContentLocale } from '#shared/locales'

const props = defineProps<{ banquet: SiteBanquet }>()

const { t, locale } = useI18n()
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

defineExpose({ form, qty, picked, total })
</script>

<template>
  <div class="bq-form">
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
          <button class="calc-presets__act" type="button" :disabled="!picked.length" @click="reset">
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
        <p v-if="banquet.sets.length" class="calc-presets__hint">{{ t('banquet.calc.setHint') }}</p>
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
              t('banquet.calc.warn', { guests: form.guests, category: warnCategory, n: shortfall })
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
        </aside>
      </div>
    </template>
  </div>
</template>
