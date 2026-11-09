import { describe, expect, it } from 'vitest'

import { assignableRoles, canBanMember, rankOf, roleBadge } from './roles'

describe('roleBadge', () => {
  it('подписи ролей', () => {
    expect(roleBadge('member', false)).toBe('')
    expect(roleBadge('moderator', false)).toBe('модератор')
    expect(roleBadge('admin', true)).toBe('создатель')
    expect(roleBadge('editor', false)).toBe('редактор')
  })
})

describe('assignableRoles', () => {
  const admin = { isAdmin: true, isOwner: false }
  const owner = { isAdmin: true, isOwner: true }
  it('обычный участник и редактор роли не меняют', () => {
    expect(assignableRoles({ isAdmin: false, isOwner: false }, { role: 'member', isOwner: false })).toEqual([])
  })
  it('администратор не выдаёт роль администратора и не трогает администраторов', () => {
    expect(assignableRoles(admin, { role: 'member', isOwner: false })).toEqual(['member', 'moderator', 'editor'])
    expect(assignableRoles(admin, { role: 'admin', isOwner: false })).toEqual([])
  })
  it('создатель выдаёт любые роли, но не себе', () => {
    expect(assignableRoles(owner, { role: 'editor', isOwner: false })).toContain('admin')
    expect(assignableRoles(owner, { role: 'admin', isOwner: true })).toEqual([])
  })
})

describe('canBanMember', () => {
  const moderator = { canModerate: true, isOwner: false, role: 'moderator' }
  it('модератор блокирует только участников', () => {
    expect(canBanMember(moderator, { role: 'member', isOwner: false })).toBe(true)
    expect(canBanMember(moderator, { role: 'editor', isOwner: false })).toBe(false)
    expect(canBanMember(moderator, { role: 'moderator', isOwner: false })).toBe(false)
  })
  it('редактор и участник не блокируют, создателя блокировать нельзя', () => {
    expect(
      canBanMember({ canModerate: false, isOwner: false, role: 'editor' }, { role: 'member', isOwner: false }),
    ).toBe(false)
    expect(canBanMember({ canModerate: true, isOwner: true, role: 'admin' }, { role: 'admin', isOwner: true })).toBe(
      false,
    )
  })
  it('создатель блокирует администратора', () => {
    expect(canBanMember({ canModerate: true, isOwner: true, role: 'admin' }, { role: 'admin', isOwner: false })).toBe(
      true,
    )
  })
  it('rankOf: неизвестная роль — как участник', () => {
    expect(rankOf('нет')).toBe(0)
    expect(rankOf('admin')).toBe(3)
  })
})
