export interface MembershipState {
  isMember: boolean
  isClosed: boolean
  hasRequested: boolean
  isBanned: boolean
}

export interface MembershipButton {
  label: string
  /** join — вступить или подать заявку, leave — выйти или отозвать заявку, none — действия нет. */
  action: 'join' | 'leave' | 'none'
  disabled: boolean
}

/** Что показывает кнопка подписки на странице сообщества. */
export const membershipButton = (c: MembershipState): MembershipButton => {
  if (c.isBanned) return { label: 'Вы в чёрном списке', action: 'none', disabled: true }
  if (c.isMember) return { label: 'Вы подписаны · Отписаться', action: 'leave', disabled: false }
  if (c.hasRequested) return { label: 'Заявка отправлена · Отменить', action: 'leave', disabled: false }
  return { label: c.isClosed ? 'Подать заявку' : 'Подписаться', action: 'join', disabled: false }
}
