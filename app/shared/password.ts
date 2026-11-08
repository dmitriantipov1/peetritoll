// Правила пароля — одни для команд на сервере и для будущих форм в админке.
export const MIN_PASSWORD_LENGTH = 10

/** Текст ошибки или null, если пароль подходит. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль не короче ${MIN_PASSWORD_LENGTH} символов`
  }
  return null
}
