// Создание админа или владельца. Регистрации в админке нет: первые учётные записи
// заводятся командой, сотрудников потом приглашает владелец (раздел «Сотрудники»).
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run users:create \
//     --payload '{"email":"olga@peetritoll.ee","name":"Ольга Петрова","role":"owner","password":"..."}'
// role — owner (владелец, по умолчанию) или admin (админ).
import { users } from '../../db/schema'
import { roles } from '#shared/access'
import { passwordProblem } from '#shared/password'

export default defineTask({
  meta: {
    name: 'users:create',
    description: 'Создать админа или владельца: email, name, password, role (owner | admin)',
  },
  async run({ payload }) {
    const email = String(payload.email ?? '')
      .trim()
      .toLowerCase()
    const name = String(payload.name ?? '').trim()
    const password = String(payload.password ?? '')
    const role = payload.role === undefined ? 'owner' : payload.role

    if (!email.includes('@')) throw new Error('Нужна почта: email')
    if (!name) throw new Error('Нужно имя: name')
    if (role !== 'owner' && role !== 'admin') {
      throw new Error('role — owner или admin. Сотрудников заводит владелец в админке')
    }
    const problem = passwordProblem(password)
    if (problem) throw new Error(problem)

    const [created] = await useDb()
      .insert(users)
      .values({
        email,
        name,
        role,
        passwordHash: await hashPassword(password),
        passwordChangedAt: new Date(),
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id })

    if (!created) throw new Error(`Почта ${email} уже занята`)
    return { result: `${roles[role]} ${name} <${email}> создан, id ${created.id}` }
  },
})
