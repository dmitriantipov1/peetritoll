// Лента, которая листается сама (как data-slider в прототипе, 15.11.2026): логотипы партнёров
// на телефоне. Каждые 2,5 с — к следующему элементу, в конце — в начало. Только когда лента
// не помещается (на компьютере — ряды, ничего не делаем), видна на экране и её не трогают
// пальцем (после касания — пауза 6 с). «Уменьшить движение» — без автопрокрутки.
import { motionOff } from '~/plugins/motion'

export function useAutoSlide(list: Ref<HTMLElement | null>) {
  let timer: ReturnType<typeof setInterval> | undefined
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    const el = list.value
    if (!el || motionOff()) return
    let visible = false
    let pausedUntil = 0
    const pause = () => (pausedUntil = Date.now() + 6000)
    el.addEventListener('pointerdown', pause)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('wheel', pause, { passive: true })
    observer = new IntersectionObserver((e) => (visible = !!e[0]?.isIntersecting), {
      threshold: 0.5,
    })
    observer.observe(el)
    timer = setInterval(() => {
      if (!visible || Date.now() < pausedUntil || el.scrollWidth <= el.clientWidth + 2) return
      const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0
      const start = el.getBoundingClientRect().left + pad
      const next = [...el.children].find((li) => li.getBoundingClientRect().left > start + 4)
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      if (!next || atEnd) el.scrollTo({ left: 0 })
      else el.scrollBy({ left: next.getBoundingClientRect().left - start })
    }, 2500)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    observer?.disconnect()
  })
}
