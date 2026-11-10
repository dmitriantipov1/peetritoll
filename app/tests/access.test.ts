// Права в админке (5.2): кто что видит и кто кого может менять
import { describe, expect, it } from 'vitest'
import { accessTo, allows } from '../shared/access'
import { assignableRoles, canManage, cleanPermissions } from '../shared/staff'

describe('доступ к разделам', () => {
  it('админ и владелец видят и правят всё, включая «Сотрудников»', () => {
    expect(accessTo('admin', {}, 'staff')).toBe('edit')
    expect(accessTo('owner', {}, 'menu')).toBe('edit')
  })

  it('сотрудник — только выданное; «Сотрудники» ему не выдаются никогда', () => {
    const perms = { menu: 'view', staff: 'edit' } as const
    expect(accessTo('staff', perms, 'menu')).toBe('view')
    expect(accessTo('staff', perms, 'gallery')).toBe('none')
    expect(accessTo('staff', perms, 'staff')).toBe('none')
  })

  it('«правит» включает «смотрит», но не наоборот', () => {
    expect(allows('edit', 'view')).toBe(true)
    expect(allows('view', 'edit')).toBe(false)
    expect(allows('none', 'view')).toBe(false)
  })
})

describe('кто кого может менять', () => {
  it('владелец — только сотрудников, админа не трогает и владельца не назначит', () => {
    expect(canManage('owner', 'staff')).toBe(true)
    expect(canManage('owner', 'admin')).toBe(false)
    expect(canManage('owner', 'owner')).toBe(false)
    expect(assignableRoles('owner')).toEqual(['staff'])
  })

  it('админ — всех; сотрудник — никого', () => {
    expect(canManage('admin', 'owner')).toBe(true)
    expect(canManage('staff', 'staff')).toBe(false)
  })

  it('права хранятся без «нет доступа» и без «Сотрудников», у админа и владельца — пусто', () => {
    expect(cleanPermissions('staff', { menu: 'edit', leads: 'none', staff: 'edit' })).toEqual({
      menu: 'edit',
    })
    expect(cleanPermissions('owner', { menu: 'edit' })).toEqual({})
  })
})
