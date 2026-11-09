import { describe, expect, it } from 'vitest'

import { membersLabel } from './format'

describe('membersLabel', () => {
  it('склоняет по правилам русского языка', () => {
    expect(membersLabel(0)).toBe('0 участников')
    expect(membersLabel(1)).toBe('1 участник')
    expect(membersLabel(2)).toBe('2 участника')
    expect(membersLabel(4)).toBe('4 участника')
    expect(membersLabel(5)).toBe('5 участников')
    expect(membersLabel(11)).toBe('11 участников')
    expect(membersLabel(14)).toBe('14 участников')
    expect(membersLabel(21)).toBe('21 участник')
    expect(membersLabel(112)).toBe('112 участников')
    expect(membersLabel(1002)).toBe('1002 участника')
  })
})
