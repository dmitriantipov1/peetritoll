// Новый пароль командой — на случай, когда войти в админку некому
// (единственный владелец или админ забыл пароль). Обычный путь — ссылка
// из админки или письмо «Забыли пароль?» (5.2 в требованиях).
// Все открытые сессии этого человека перестают действовать.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run users:reset-password \
//     --payload '{"email":"olga@peetritoll.ee","password":"..."}'
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'
import { passwordProblem } from '#shared/password'

export default defineTask({
  meta: {
    name: 'users:reset-password',
    description: 'Задать новый пароль: email, password',
  },
  async run({ payload }) {
    const email = String(payload.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(payload.password ?? '')

    const problem = passwordProblem(password)
    if (problem) throw new Error(problem)

    const [updated] = await useDb()
      .update(users)
      .set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() })
      .where(eq(users.email, email))
      .returning({ id: users.id, name: users.name, isActive: users.isActive })

    if (!updated) throw new Error(`Нет учётной записи с почтой ${email}`)
    const note = updated.isActive ? '' : ' Учётная запись отключена — войти всё равно не получится.'
    return {
      result: `Пароль для ${updated.name} <${email}> изменён, старые сессии закрыты.${note}`,
    }
  },
})
