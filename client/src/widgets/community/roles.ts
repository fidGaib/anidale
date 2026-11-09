export type Role = 'member' | 'moderator' | 'editor' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  member: 'Участник',
  moderator: 'Модератор',
  editor: 'Редактор',
  admin: 'Администратор',
}

const RANK: Record<string, number> = { member: 0, moderator: 1, editor: 2, admin: 3 }

export const rankOf = (role: string | null | undefined): number => RANK[role ?? ''] ?? 0

/** Подпись рядом с именем: создатель, роль или пусто для обычного участника. */
export const roleBadge = (role: string, isOwner: boolean): string => {
  if (isOwner) return 'создатель'
  return role === 'member' ? '' : (ROLE_LABELS[role as Role] ?? '').toLowerCase()
}

/**
 * Какие роли может назначить просматривающий этому участнику; пусто — менять роль нельзя.
 * Администратор назначает модераторов и редакторов; роль администратора выдаёт и снимает только создатель.
 */
export const assignableRoles = (
  viewer: { isAdmin: boolean; isOwner: boolean },
  target: { role: string; isOwner: boolean },
): Role[] => {
  if (!viewer.isAdmin || target.isOwner) return []
  if (target.role === 'admin' && !viewer.isOwner) return []
  return viewer.isOwner ? ['member', 'moderator', 'editor', 'admin'] : ['member', 'moderator', 'editor']
}

/** Можно ли заблокировать участника: модератор или выше, цель ниже по роли (создатель блокирует любого, кроме себя). */
export const canBanMember = (
  viewer: { canModerate: boolean; isOwner: boolean; role: string },
  target: { role: string; isOwner: boolean },
): boolean => {
  if (!viewer.canModerate || target.isOwner) return false
  return viewer.isOwner || rankOf(target.role) < rankOf(viewer.role)
}
