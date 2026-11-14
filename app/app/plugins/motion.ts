// Плавные числа (как в прототипе, 14.11.2026). Директива v-bump="значение": число «подпрыгивает»,
// когда значение поменялось (количество в калькуляторе). Суммы досчитывают — компонент TweenNumber.
// При «уменьшить движение» — без анимации.
export function motionOff() {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function bump(el: Element | null | undefined) {
  if (!el || motionOff()) return
  el.classList.remove('is-bump')
  void (el as HTMLElement).offsetWidth // перезапустить, если нажали подряд
  el.classList.add('is-bump')
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive<HTMLElement & { _bumpValue?: unknown }, unknown>('bump', {
    // На сервере ничего не нужно, но директива должна быть объявлена и там
    getSSRProps: () => ({}),
    mounted(el, { value }) {
      el._bumpValue = value
    },
    updated(el, { value }) {
      if (el._bumpValue !== value) bump(el)
      el._bumpValue = value
    },
  })
})
