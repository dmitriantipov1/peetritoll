// Плавные фильтры (как в прототипе, 14.11.2026): после смены фильтра то, что сейчас на экране,
// проявляется с лёгким подъёмом по очереди. Вызывать после изменения состояния фильтра:
// soft() — дождётся, пока Vue перерисует список. За экраном — без анимации.
import { motionOff } from '~/plugins/motion'

export function useSoftFilter(scope: Ref<HTMLElement | null>, itemSelector: string) {
  return async function soft() {
    if (!scope.value || motionOff()) return
    await nextTick()
    let i = 0
    scope.value.querySelectorAll<HTMLElement>(itemSelector).forEach((el) => {
      if (el.offsetParent === null) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return
      el.classList.add('is-in') // уже на экране — появление при прокрутке не нужно
      el.classList.remove('filter-in')
      void el.offsetWidth
      el.style.setProperty('--filter-delay', `${Math.min(i++, 10) * 35}ms`)
      el.classList.add('filter-in')
      el.addEventListener('animationend', () => el.classList.remove('filter-in'), { once: true })
    })
  }
}
