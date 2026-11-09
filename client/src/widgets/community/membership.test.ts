import { describe, expect, it } from 'vitest'

import { membershipButton } from './membership'

const base = { isMember: false, isClosed: false, hasRequested: false, isBanned: false }

describe('membershipButton', () => {
  it('открытое сообщество: подписаться', () => {
    expect(membershipButton(base)).toEqual({ label: 'Подписаться', action: 'join', disabled: false })
  })
  it('закрытое: подать заявку, затем отменить её', () => {
    expect(membershipButton({ ...base, isClosed: true }).label).toBe('Подать заявку')
    expect(membershipButton({ ...base, isClosed: true, hasRequested: true })).toMatchObject({
      label: 'Заявка отправлена · Отменить',
      action: 'leave',
    })
  })
  it('участник может отписаться', () => {
    expect(membershipButton({ ...base, isMember: true })).toMatchObject({ action: 'leave', disabled: false })
  })
  it('заблокированному кнопка недоступна, даже если он когда-то был участником', () => {
    expect(membershipButton({ ...base, isBanned: true, isMember: true })).toMatchObject({
      action: 'none',
      disabled: true,
    })
  })
})
