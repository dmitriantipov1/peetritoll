// SumUp Hosted Checkout (5.3): создать платёж, спросить его статус, закрыть.
// Покупатель платит на странице SumUp (checkout.sumup.com) — карточные данные к нам не попадают.
// Ключи — только на сервере: NUXT_SUMUP_API_KEY (sup_sk_…) и NUXT_SUMUP_MERCHANT_CODE.
// Песочница и боевой аккаунт отличаются только ключами. Доступно в серверном коде без импорта.
//
// Документация: developer.sumup.com/online-payments (Hosted Checkout, Checkouts API)

const API = 'https://api.sumup.com/v0.1'

/** PENDING — ждёт оплаты; PAID — оплачен; FAILED — не прошёл; EXPIRED — закрыт или истёк */
export type SumupCheckoutStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'

export interface SumupCheckout {
  id: string
  status: SumupCheckoutStatus
  checkout_reference: string
  amount: number
  hosted_checkout_url?: string
  transactions?: { transaction_code?: string; status?: string; timestamp?: string }[]
}

/** Ключи заданы — магазин принимает оплату онлайн; нет — заказ «ждёт оплаты», как раньше */
export function sumupConfigured(): boolean {
  const c = useRuntimeConfig().sumup
  return !!(c?.apiKey && c?.merchantCode)
}

function sumupFetch<T>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'DELETE'; body?: object } = {},
) {
  return $fetch<T>(`${API}${path}`, {
    method: opts.method ?? 'GET',
    body: opts.body,
    headers: { Authorization: `Bearer ${useRuntimeConfig().sumup.apiKey}` },
    timeout: 15_000,
  })
}

/**
 * Новый платёж. reference — наш номер попытки «PT-2001-1»: SumUp требует уникальный
 * на каждый платёж. redirectUrl — куда вернуть покупателя, returnUrl — куда слать уведомления.
 */
export function createSumupCheckout(p: {
  reference: string
  amountCents: number
  description: string
  redirectUrl: string
  returnUrl: string
}) {
  return sumupFetch<SumupCheckout>('/checkouts', {
    method: 'POST',
    body: {
      checkout_reference: p.reference,
      // SumUp ждёт сумму в евро числом: 12.5, а не 1250
      amount: p.amountCents / 100,
      currency: 'EUR',
      merchant_code: useRuntimeConfig().sumup.merchantCode,
      description: p.description,
      redirect_url: p.redirectUrl,
      return_url: p.returnUrl,
      hosted_checkout: { enabled: true },
    },
  })
}

export function getSumupCheckout(id: string) {
  return sumupFetch<SumupCheckout>(`/checkouts/${encodeURIComponent(id)}`)
}

/** Закрыть платёж, чтобы по старой странице уже нельзя было заплатить. Ошибку не бросает:
 *  оплаченный или уже истёкший SumUp не закроет — это выяснит проверка статуса */
export async function closeSumupCheckout(id: string): Promise<boolean> {
  try {
    await sumupFetch(`/checkouts/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return true
  } catch {
    return false
  }
}

/** Код успешной транзакции — в админку, для сверки с кабинетом SumUp */
export function paidTransactionCode(c: SumupCheckout): string | null {
  const t = c.transactions?.find((x) => x.status === 'SUCCESSFUL') ?? c.transactions?.[0]
  return t?.transaction_code ?? null
}
