// Лента, которая плывёт сама (как data-slider в прототипе, 15.11.2026): логотипы партнёров
// на телефоне медленно и непрерывно едут влево (~25 px/с), по кругу. В шаблоне за набором стоит
// его копия ([data-clone], на компьютере скрыта): когда копия доезжает до начала, лента незаметно
// перескакивает назад на длину набора. Только когда лента не помещается (на компьютере — ряды),
// видна на экране и её не трогают пальцем (после касания — пауза 4 с, дальше плывёт с того места,
// куда долистали). «Уменьшить движение» — стоит.
import { motionOff } from '~/plugins/motion'

const SPEED = 25 // px в секунду

export function useAutoSlide(list: Ref<HTMLElement | null>) {
  let frame = 0
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    const el = list.value
    if (!el || motionOff()) return
    const first = el.firstElementChild as HTMLElement | null
    const firstCopy = el.querySelector<HTMLElement>('[data-clone]')
    if (!first || !firstCopy) return
    let visible = false
    let pausedUntil = 0
    let pos = el.scrollLeft
    let last = 0
    const pause = () => (pausedUntil = performance.now() + 4000)
    el.addEventListener('pointerdown', pause)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('wheel', pause, { passive: true })
    observer = new IntersectionObserver((e) => (visible = !!e[0]?.isIntersecting))
    observer.observe(el)
    const step = (now: number) => {
      const dt = last ? Math.min(now - last, 100) / 1000 : 0
      last = now
      const loop = firstCopy.offsetLeft - first.offsetLeft // длина одного набора
      const moving =
        visible && now >= pausedUntil && el.scrollWidth > el.clientWidth + 2 && loop > 0
      el.classList.toggle('is-drift', moving)
      if (moving) {
        if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft // долистали пальцем
        pos += SPEED * dt
        if (pos >= loop) pos -= loop
        el.scrollLeft = pos
      } else pos = el.scrollLeft
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    observer?.disconnect()
  })
}
