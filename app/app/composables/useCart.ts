// Корзина магазина (как в прототипе, 14.11.2026): живёт в браузере (localStorage, ключ pt-cart-app),
// на сервер уходит только при оформлении — там цены и наличие проверяются заново.
// В строке — снимок товара на момент «В корзину», чтобы корзина рисовалась без запроса.
import type { SiteShopCard, SiteShopVariant } from '#shared/site-shop'

export interface CartItem {
  variantId: number
  slug: string
  name: string
  /** Вариант: «Печатная книга», «PDF»; у единственного — пусто */
  label: string
  priceCents: number
  photo: string | null
  kind: SiteShopVariant['kind']
  /** Только самовывоз (антиквариат) */
  pickupOnly: boolean
  /** Больше не положить: штучный товар или остаток */
  maxQty: number
  qty: number
}

const KEY = 'pt-cart-app'
const MAX_QTY = 20

function readStorage(): CartItem[] {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export function useCart() {
  const items = useState<CartItem[]>('cart', () => [])
  // Корзину читаем после гидрации: на сервере её нет, иначе разметка разойдётся
  const loaded = useState('cart-loaded', () => false)
  const toast = useState<string | null>('cart-toast', () => null)

  function load() {
    if (loaded.value) return
    items.value = readStorage()
    loaded.value = true
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items.value))
    } catch {
      // приватный режим — корзина живёт до закрытия вкладки
    }
  }

  const count = computed(() => items.value.reduce((s, i) => s + i.qty, 0))
  const sumCents = computed(() => items.value.reduce((s, i) => s + i.qty * i.priceCents, 0))

  function find(variantId: number) {
    return items.value.find((i) => i.variantId === variantId)
  }
  /** Можно ли положить ещё одну штуку */
  function canAdd(variant: SiteShopVariant) {
    if (variant.stock === 0) return false
    const max = Math.min(MAX_QTY, variant.stock ?? MAX_QTY)
    return (find(variant.id)?.qty ?? 0) < max
  }

  function add(product: Pick<SiteShopCard, 'slug' | 'name' | 'photo'>, variant: SiteShopVariant) {
    load()
    if (!canAdd(variant)) return
    const found = find(variant.id)
    if (found) found.qty += 1
    else
      items.value.push({
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        label: variant.label,
        priceCents: variant.priceCents,
        photo: product.photo?.url ?? null,
        kind: variant.kind,
        pickupOnly: variant.kind === 'physical' && variant.delivery === 'pickup',
        maxQty: Math.min(MAX_QTY, variant.stock ?? MAX_QTY),
        qty: 1,
      })
    save()
    toast.value = variant.label ? `${product.name} · ${variant.label}` : product.name
  }

  function setQty(variantId: number, qty: number) {
    const item = find(variantId)
    if (!item) return
    item.qty = Math.max(1, Math.min(item.maxQty, qty))
    save()
  }
  function remove(variantId: number) {
    items.value = items.value.filter((i) => i.variantId !== variantId)
    save()
  }
  function clear() {
    items.value = []
    save()
  }

  return { items, loaded, toast, count, sumCents, load, find, canAdd, add, setQty, remove, clear }
}
