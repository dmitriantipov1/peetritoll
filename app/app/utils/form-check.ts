// Проверка форм на сайте (16.11.2026, 8.6 в требованиях): что не так с полем.
// Правила — атрибутами поля, как в прототипе (js/main.js): required, type="email", min/max,
// minlength, data-check="phone" и data-check="contact"; data-one-of="имя" у нескольких полей — нужно хотя
// бы одно из них (телефон или e-mail в «Написать нам», 22.11.2026), ошибка — у первого из группы. Совпадают с серверными (shared/requests.ts,
// shared/orders.ts, shared/contact-message.ts): что пропустит браузер, примет и сервер.
// Возвращает ключ сообщения (form.check.<key>) и подстановку; тексты — в useFormCheck.

export type CheckProblem = { key: string; n?: string } | null

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[+\d\s()-]+$/

export type CheckControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function phoneProblem(v: string): CheckProblem {
  if (!PHONE_RE.test(v)) return { key: 'phone' }
  return v.replace(/\D/g, '').length < 5 ? { key: 'phoneShort' } : null
}

/** Кнопки-переключатели одной группы */
export function radioGroup(el: HTMLInputElement): HTMLInputElement[] {
  if (!el.form) return [el]
  return [...el.form.elements].filter(
    (r): r is HTMLInputElement => r instanceof HTMLInputElement && r.type === 'radio' && r.name === el.name,
  )
}

export function checkProblem(el: CheckControl): CheckProblem {
  if (el instanceof HTMLInputElement && el.type === 'radio') {
    const group = radioGroup(el)
    return group.some((r) => r.required) && !group.some((r) => r.checked) ? { key: 'choose' } : null
  }
  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    return el.required && !el.checked ? { key: el.dataset.msg || 'consent' } : null
  }
  const v = el.value.trim()
  if (el.validity.badInput) return { key: el.type === 'number' ? 'number' : el.type === 'date' ? 'date' : 'required' }
  if (!v) {
    if (el.dataset.oneOf && el.form) {
      const group = [
        ...el.form.querySelectorAll<HTMLInputElement>(`[data-one-of="${el.dataset.oneOf}"]`),
      ]
      return group[0] === el && group.every((g) => !g.value.trim()) ? { key: 'contact' } : null
    }
    if (!el.required) return null
    if (el.dataset.msg) return { key: el.dataset.msg }
    if (el instanceof HTMLSelectElement) return { key: 'choose' }
    return { key: el.type === 'date' || el.type === 'time' ? el.type : 'required' }
  }
  if (el.type === 'email' && !EMAIL_RE.test(v)) return { key: 'email' }
  if (el.dataset.check === 'phone') return phoneProblem(v)
  if (el.dataset.check === 'contact') {
    if (v.includes('@')) return EMAIL_RE.test(v) ? null : { key: 'email' }
    return phoneProblem(v) ? { key: 'contact' } : null
  }
  if (el instanceof HTMLInputElement) {
    if (el.validity.rangeUnderflow) return { key: el.type === 'date' ? 'minDate' : 'min', n: el.min }
    if (el.validity.rangeOverflow) return { key: el.type === 'date' ? 'maxDate' : 'max', n: el.max }
    if (el.validity.stepMismatch) return { key: el.type === 'time' ? 'step' : 'whole' }
  }
  if (el.validity.tooShort && !(el instanceof HTMLSelectElement)) {
    return { key: 'short', n: String(el.minLength) }
  }
  return null
}

/** Поля формы, которые проверяем: видимые и включённые; у группы кнопок — первая из группы */
export function checkFields(form: HTMLFormElement): CheckControl[] {
  const seen = new Set<string>()
  return [...form.elements].filter((el): el is CheckControl => {
    if (
      !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)
    )
      return false
    if (el.disabled || el.closest('[hidden], .visually-hidden')) return false
    // Без name и id — служебное поле (количество в калькуляторе), не проверяем
    if (!el.name && !el.id) return false
    if (['hidden', 'submit', 'button', 'reset'].includes(el.type)) return false
    if (el.type === 'radio') {
      if (seen.has(el.name)) return false
      seen.add(el.name)
    }
    return true
  })
}

/** Ключ поля для ошибок: name (совпадает с полем на сервере), иначе id */
export function checkKey(el: CheckControl) {
  return el.name || el.id
}
