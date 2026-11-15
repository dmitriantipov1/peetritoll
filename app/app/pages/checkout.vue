<script setup lang="ts">
// Оформление заказа (checkout.html прототипа) одной страницей: контакты, получение, оплата.
// Способы получения зависят от корзины (shared/orders.ts): только цифровое — получать нечего,
// антиквариат — весь заказ самовывозом. Цены доставки — из настроек магазина.
// Оплаты пока нет (решение 15.11.2026): заказ уходит нам со статусом «ждёт оплаты»,
// на «Заказ принят» — что будет дальше. Потом здесь встанет переход на страницу оплаты SumUp.
import {
  carriers,
  deliveryChoices,
  euCountries,
  orderTotals,
  type DeliveryMethod,
  type OrderProblem,
} from '#shared/orders'
import type { ShopSettings } from '#shared/shop'
import { formatPrice } from '#shared/money'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCart()

useHead({ title: () => `${t('checkout.title')} — Tavern Peetri Toll` })

const { data: settings } = await useFetch<ShopSettings>('/api/site/shop/settings', {
  query: { locale },
})

onMounted(() => {
  cart.load()
  if (!cart.items.value.length) navigateTo(localePath('/cart'), { replace: true })
})

const lines = computed(() => cart.items.value)
const choices = computed(() => deliveryChoices(lines.value))
const hasPhysical = computed(() => !choices.value.includes('none'))
const hasDigital = computed(() => lines.value.some((i) => i.kind === 'digital'))
const pickupOnly = computed(() => hasPhysical.value && choices.value.length === 1)

const form = reactive({
  name: '',
  phone: '',
  email: '',
  comment: '',
  delivery: 'pickup' as DeliveryMethod,
  carrier: carriers[0] as (typeof carriers)[number],
  parcelPoint: '',
  country: 'FI' as (typeof euCountries)[number],
  postcode: '',
  address: '',
  terms: false,
  marketingOptIn: false,
  website: '',
})
const method = computed<DeliveryMethod>(() => (hasPhysical.value ? form.delivery : 'none'))
watch(choices, (c) => {
  if (!c.includes(form.delivery)) form.delivery = c[0]!
})

const shipPrice = (m: DeliveryMethod) =>
  settings.value ? orderTotals([], m, settings.value).deliveryCents : 0
const totals = computed(() =>
  settings.value
    ? orderTotals(lines.value, method.value, settings.value)
    : { goodsCents: 0, deliveryCents: 0, totalCents: 0 },
)
const deliveryText = computed(() =>
  !hasPhysical.value
    ? t('checkout.noDelivery')
    : totals.value.deliveryCents
      ? formatPrice(totals.value.deliveryCents)
      : t('checkout.free'),
)

const countryNames = computed(() => {
  const names = new Intl.DisplayNames(locale.value, { type: 'region' })
  return euCountries
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale.value))
})

const sending = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})

// Корзина устарела: поправить её по ответу сервера и показать, что изменилось
function applyProblems(problems: OrderProblem[]) {
  for (const p of problems) {
    if (p.reason === 'gone') cart.remove(p.variantId)
    const item = cart.find(p.variantId)
    if (!item) continue
    if (p.reason === 'price' && p.priceCents !== undefined) item.priceCents = p.priceCents
    if (p.reason === 'stock' && p.stock !== undefined) {
      if (p.stock === 0) cart.remove(p.variantId)
      else {
        item.maxQty = p.stock
        cart.setQty(p.variantId, Math.min(item.qty, p.stock))
      }
    }
  }
  cart.save()
}

async function submit() {
  error.value = ''
  issues.value = {}
  sending.value = true
  try {
    const res = await $fetch<{ id: number; publicId: string }>('/api/site/orders', {
      method: 'POST',
      body: {
        locale: locale.value,
        name: form.name,
        email: form.email,
        phone: form.phone,
        comment: form.comment,
        lines: lines.value.map((i) => ({
          variantId: i.variantId,
          qty: i.qty,
          priceCents: i.priceCents,
        })),
        delivery: method.value,
        ...(method.value === 'parcel'
          ? { carrier: form.carrier, parcelPoint: form.parcelPoint }
          : {}),
        ...(method.value === 'eu'
          ? { country: form.country, postcode: form.postcode, address: form.address }
          : {}),
        marketingOptIn: form.marketingOptIn,
        consent: form.terms,
        website: form.website,
      },
    })
    cart.clear()
    await navigateTo({ path: localePath('/order-done'), query: { id: res.publicId } })
  } catch (e) {
    const problems = (e as { data?: { data?: { problems?: OrderProblem[] } } }).data?.data?.problems
    if (problems?.length) {
      applyProblems(problems)
      error.value = t('checkout.changed')
      if (!cart.items.value.length) navigateTo(localePath('/cart'))
    } else {
      error.value = apiErrorMessage(e, t('checkout.failed'))
      issues.value = apiErrorIssues(e)
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <section class="page-hero page-hero--short">
      <img class="hero__bg" src="/images/weapons-1.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/shop')">{{ t('nav.shop') }}</NuxtLink> /
          {{ t('checkout.title') }}
        </p>
        <h1 class="page-hero__title">{{ t('checkout.title') }}</h1>
        <p class="page-hero__lead">{{ t('checkout.lead') }}</p>
      </div>
    </section>

    <section class="section section--shop">
      <div class="container">
        <form
          v-if="cart.loaded.value && lines.length"
          class="cart-wrap checkout"
          novalidate
          @submit.prevent="submit"
        >
          <div class="checkout__steps">
            <h2 class="bq-step">
              <span class="bq-step__num">1</span> {{ t('checkout.contacts') }}
            </h2>
            <div class="form">
              <div class="field">
                <label for="o-name">{{ t('checkout.name') }}</label>
                <input id="o-name" v-model="form.name" type="text" autocomplete="name" required />
                <span v-if="issues.name" class="form__error">{{ issues.name }}</span>
              </div>
              <div class="field">
                <label for="o-phone">{{ t('checkout.phone') }}</label>
                <input id="o-phone" v-model="form.phone" type="tel" autocomplete="tel" />
                <span v-if="issues.phone" class="form__error">{{ issues.phone }}</span>
              </div>
              <div class="field form__full">
                <label for="o-mail">E-mail</label>
                <input
                  id="o-mail"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  required
                />
                <span class="form__note">{{ t('checkout.emailNote') }}</span>
                <span v-if="issues.email" class="form__error">{{ issues.email }}</span>
              </div>
            </div>

            <template v-if="hasPhysical">
              <h2 class="bq-step">
                <span class="bq-step__num">2</span> {{ t('checkout.delivery') }}
              </h2>
              <p v-if="pickupOnly" class="note checkout__note">{{ t('checkout.pickupOnly') }}</p>
              <div class="ship-opts" role="radiogroup" :aria-label="t('checkout.delivery')">
                <label
                  v-for="m in ['pickup', 'parcel', 'eu'] as const"
                  :key="m"
                  class="ship-opt"
                  :class="{ 'is-off': !choices.includes(m) }"
                >
                  <input
                    v-model="form.delivery"
                    type="radio"
                    name="ship"
                    :value="m"
                    :disabled="!choices.includes(m)"
                  />
                  <span class="ship-opt__head"
                    ><b>{{ t(`checkout.ship.${m}.title`) }}</b
                    ><span>{{
                      shipPrice(m) ? formatPrice(shipPrice(m)) : t('checkout.free')
                    }}</span></span
                  >
                  <span class="ship-opt__text">{{ t(`checkout.ship.${m}.text`) }}</span>
                </label>
              </div>

              <div v-if="method === 'parcel'" class="form checkout__fields">
                <div class="field">
                  <label for="o-carrier">{{ t('checkout.carrier') }}</label>
                  <select id="o-carrier" v-model="form.carrier">
                    <option v-for="c in carriers" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="field">
                  <label for="o-point">{{ t('checkout.point') }}</label>
                  <input
                    id="o-point"
                    v-model="form.parcelPoint"
                    type="text"
                    :placeholder="t('checkout.pointHint')"
                  />
                  <span v-if="issues.parcelPoint" class="form__error">{{
                    issues.parcelPoint
                  }}</span>
                </div>
              </div>
              <div v-if="method === 'eu'" class="form checkout__fields">
                <div class="field">
                  <label for="o-country">{{ t('checkout.country') }}</label>
                  <select id="o-country" v-model="form.country">
                    <option v-for="c in countryNames" :key="c.code" :value="c.code">
                      {{ c.name }}
                    </option>
                  </select>
                </div>
                <div class="field">
                  <label for="o-zip">{{ t('checkout.postcode') }}</label>
                  <input
                    id="o-zip"
                    v-model="form.postcode"
                    type="text"
                    autocomplete="postal-code"
                  />
                  <span v-if="issues.postcode" class="form__error">{{ issues.postcode }}</span>
                </div>
                <div class="field form__full">
                  <label for="o-addr">{{ t('checkout.address') }}</label>
                  <input
                    id="o-addr"
                    v-model="form.address"
                    type="text"
                    autocomplete="street-address"
                    :placeholder="t('checkout.addressHint')"
                  />
                  <span v-if="issues.address" class="form__error">{{ issues.address }}</span>
                </div>
              </div>
              <p v-if="hasDigital" class="form__note">{{ t('checkout.mixed') }}</p>
            </template>
            <p v-else class="note checkout__note">{{ t('checkout.digitalOnly') }}</p>

            <h2 class="bq-step">
              <span class="bq-step__num">{{ hasPhysical ? 3 : 2 }}</span> {{ t('checkout.pay') }}
            </h2>
            <div class="pay-box">
              <p class="form__note">{{ t('checkout.payLater') }}</p>
            </div>
            <div class="form">
              <div class="field form__full">
                <label for="o-comment">{{ t('checkout.comment') }}</label>
                <textarea id="o-comment" v-model="form.comment" rows="2" maxlength="2000" />
              </div>
            </div>
            <!-- Ловушка для роботов: людям не видна, заполненная — заказ не заводим -->
            <div class="visually-hidden" aria-hidden="true">
              <label for="o-website">Website</label>
              <input
                id="o-website"
                v-model="form.website"
                type="text"
                tabindex="-1"
                autocomplete="off"
              />
            </div>
            <label class="form__check">
              <input v-model="form.terms" type="checkbox" />
              <span
                >{{ t('checkout.terms') }}
                <a
                  href="https://peetritoll.sumupstore.com/lehekulg/tingimused"
                  target="_blank"
                  rel="noopener"
                  >{{ t('checkout.termsLink') }}</a
                >
                {{ t('checkout.and') }}
                <NuxtLink :to="localePath('/privacy')" target="_blank">{{
                  t('checkout.policy')
                }}</NuxtLink></span
              >
            </label>
            <label class="form__check">
              <input v-model="form.marketingOptIn" type="checkbox" />
              <span>{{ t('checkout.news') }}</span>
            </label>
          </div>

          <aside class="cart-side" :aria-label="t('checkout.yourOrder')">
            <p class="calc-side__title">{{ t('checkout.yourOrder') }}</p>
            <ul class="cart-lines cart-lines--mini">
              <li v-for="i in lines" :key="i.variantId" class="cart-line">
                <div
                  class="cart-line__img"
                  :class="{ 'is-missing': !i.photo }"
                  :data-ph="i.photo ? undefined : i.slug.slice(0, 24)"
                >
                  <img v-if="i.photo" :src="i.photo" alt="" loading="lazy" />
                </div>
                <div class="cart-line__body">
                  <p class="cart-line__name">
                    {{ i.name }}<template v-if="i.label"> · {{ i.label }}</template>
                  </p>
                </div>
                <div class="cart-line__qty">{{ i.qty }} {{ t('checkout.pcs') }}</div>
                <p class="cart-line__sum">{{ formatPrice(i.qty * i.priceCents) }}</p>
              </li>
            </ul>
            <dl class="cart-sum">
              <div>
                <dt>{{ t('checkout.goods') }}</dt>
                <dd>{{ formatPrice(totals.goodsCents) }}</dd>
              </div>
              <div>
                <dt>{{ t('checkout.deliveryCost') }}</dt>
                <dd v-bump="deliveryText">{{ deliveryText }}</dd>
              </div>
              <div class="cart-sum__total">
                <dt>{{ t('checkout.total') }}</dt>
                <dd><TweenNumber :value="totals.totalCents" :format="formatPrice" /></dd>
              </div>
            </dl>
            <button
              class="btn btn--red cart-side__go"
              type="submit"
              :disabled="sending || !form.terms"
            >
              {{ sending ? t('checkout.sending') : t('checkout.send') }}
            </button>
            <p v-if="error" class="form__error" role="alert">{{ error }}</p>
            <NuxtLink class="link-more" :to="localePath('/cart')">{{
              t('checkout.back')
            }}</NuxtLink>
          </aside>
        </form>
      </div>
    </section>
  </div>
</template>
