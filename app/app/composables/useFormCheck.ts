// Проверка формы в браузере (16.11.2026, 8.6 в требованиях) — та же, что в прототипе (js/main.js).
// «Хвалим сразу, ругаем позже»: ошибка появляется, когда гость ушёл из поля, которое начал заполнять,
// или при отправке; поле с ошибкой проверяется на каждое нажатие, исправил — сообщение уходит.
// После неудачной отправки все поля проверяются на ходу.
//
// Ключ поля — атрибут name (как поле на сервере), сообщение — <FieldError :id="`${id}-err`"
// :msg="fc.error('name')">. Ошибки с сервера (issues) показываются там же и уходят, когда поле правят.
//
//   const formEl = ref<HTMLFormElement | null>(null)
//   const fc = useFormCheck(formEl, issues)
//   async function submit() { if (!fc.check()) return; … }
import type { Ref } from 'vue'
import { motionOff } from '~/plugins/motion'
import { checkFields, checkKey, checkProblem, radioGroup, type CheckControl } from '~/utils/form-check'

const isControl = (el: EventTarget | null): el is CheckControl =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement

export function useFormCheck(
  formEl: Ref<HTMLFormElement | null>,
  issues?: Ref<Record<string, string>>,
) {
  const { t, locale } = useI18n()
  const errors = reactive(new Map<string, string>())
  const dirty = new Set<string>()
  let submitted = false

  function message(el: CheckControl): string {
    const p = checkProblem(el)
    if (!p) return ''
    let n = p.n
    if (n && (p.key === 'minDate' || p.key === 'maxDate')) {
      n = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(
        new Date(`${n}T12:00:00`),
      )
    }
    return t(`form.check.${p.key}`, { n })
  }

  /** Куда вешать отметку: у кнопок-переключателей — их fieldset */
  function target(el: CheckControl): HTMLElement {
    return (el.type === 'radio' && el.closest('fieldset')) || el
  }

  /** Отметки на самом поле: aria-invalid, связь с сообщением, золотая галочка у верного */
  function paint(el: CheckControl) {
    const key = checkKey(el)
    const tg = target(el)
    const msg = errors.get(key) || issues?.value[key]
    const errId = `${tg.id || el.id}-err`
    const ids = (tg.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x && x !== errId)
    if (msg) {
      tg.setAttribute('aria-invalid', 'true')
      tg.removeAttribute('data-valid')
      ids.push(errId)
    } else {
      tg.removeAttribute('aria-invalid')
      const filled = el.type !== 'radio' && el.type !== 'checkbox' && el.value.trim()
      if (filled && (el.required || el.dataset.check) && dirty.has(key)) tg.setAttribute('data-valid', '')
      else tg.removeAttribute('data-valid')
    }
    if (ids.length) tg.setAttribute('aria-describedby', ids.join(' '))
    else tg.removeAttribute('aria-describedby')
  }

  function checkOne(el: CheckControl) {
    if (el instanceof HTMLInputElement && el.type === 'radio') el = radioGroup(el)[0] ?? el
    const key = checkKey(el)
    dirty.add(key)
    const msg = message(el)
    if (msg) errors.set(key, msg)
    else errors.delete(key)
    paint(el)
  }

  function onInput(e: Event) {
    if (!isControl(e.target)) return
    const el = e.target
    const key = checkKey(el)
    dirty.add(key)
    // Поле правят — ошибка с сервера по нему больше не к месту
    if (issues?.value[key]) {
      issues.value = Object.fromEntries(Object.entries(issues.value).filter(([k]) => k !== key))
    }
    if (errors.has(key) || submitted) checkOne(el)
    else paint(el)
  }

  function onChange(e: Event) {
    if (!isControl(e.target)) return
    // Галочка, кнопка, список, дата — выбор сделан осознанно, показываем сразу
    if (e.target.matches('select, [type="checkbox"], [type="radio"], [type="date"], [type="time"]')) {
      checkOne(e.target)
    }
  }

  function onBlur(e: Event) {
    if (!isControl(e.target) || e.target.matches('[type="radio"], [type="checkbox"]')) return
    const key = checkKey(e.target)
    if (dirty.has(key) || errors.has(key)) checkOne(e.target)
  }

  function shake(els: HTMLElement[]) {
    if (motionOff()) return
    for (const el of els) {
      el.classList.remove('is-shake')
      void el.offsetWidth
      el.classList.add('is-shake')
      el.addEventListener('animationend', () => el.classList.remove('is-shake'), { once: true })
    }
  }

  /** Проверить всю форму перед отправкой: true — можно отправлять */
  function check(): boolean {
    const form = formEl.value
    if (!form) return true
    submitted = true
    const bad: CheckControl[] = []
    for (const el of checkFields(form)) {
      const key = checkKey(el)
      dirty.add(key)
      const msg = message(el)
      if (msg) {
        errors.set(key, msg)
        bad.push(el)
      } else errors.delete(key)
      paint(el)
    }
    const first = bad[0]
    if (!first) return true
    const tg = target(first)
    tg.scrollIntoView({ behavior: motionOff() ? 'auto' : 'smooth', block: 'center' })
    ;(first.type === 'radio' ? first : tg).focus({ preventScroll: true })
    shake(bad.map(target))
    return false
  }

  /** После успешной отправки: форма снова «чистая» */
  function reset() {
    submitted = false
    dirty.clear()
    errors.clear()
    const form = formEl.value
    if (form) form.querySelectorAll('[aria-invalid], [data-valid]').forEach((el) => {
      el.removeAttribute('aria-invalid')
      el.removeAttribute('data-valid')
    })
  }

  /** Сообщение под полем: своё или с сервера */
  function error(key: string) {
    return errors.get(key) || issues?.value[key] || ''
  }

  // Ошибки с сервера пришли — отметить поля
  if (issues) {
    watch(
      issues,
      () => {
        const form = formEl.value
        if (form) for (const el of checkFields(form)) paint(el)
      },
      { flush: 'post' },
    )
  }

  // Форма может появиться позже (после «Изменить заявку», по v-if) — вешаемся на каждую новую
  watch(
    formEl,
    (form, old) => {
      if (old) {
        old.removeEventListener('input', onInput)
        old.removeEventListener('change', onChange)
        old.removeEventListener('focusout', onBlur)
      }
      if (!form) return
      form.noValidate = true
      form.addEventListener('input', onInput)
      form.addEventListener('change', onChange)
      form.addEventListener('focusout', onBlur)
    },
    { flush: 'post', immediate: true },
  )

  return { check, reset, error }
}
