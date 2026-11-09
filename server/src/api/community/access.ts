import prisma from '@/db/db'

/** Роли участника сообщества от младшей к старшей. */
export type CommunityRole = 'member' | 'moderator' | 'editor' | 'admin'

export const ROLES: CommunityRole[] = ['member', 'moderator', 'editor', 'admin']

/** Старшинство роли: по нему сортируется список участников и решается, кто кого может заблокировать. */
export const roleRank = (role: string | null | undefined): number => {
  const index = ROLES.indexOf(role as CommunityRole)
  return index < 0 ? 0 : index
}

/** Кто что может. Администратор — всё; модератор следит за порядком; редактор ведёт содержимое. */
export const can = {
  /** Настройки, ссылки, контакты и роли: только администратор. */
  configure: (role: string | null | undefined) => role === 'admin',
  /** Публиковать от имени сообщества: записи, статьи, фото, видео, музыка. */
  publish: (role: string | null | undefined) => role === 'admin' || role === 'editor',
  /** Заявки, предложка, чёрный список, обсуждения. */
  moderate: (role: string | null | undefined) => role === 'admin' || role === 'moderator',
  /** Править и удалять записи и файлы сообщества. */
  manageContent: (role: string | null | undefined) => role === 'admin' || role === 'editor' || role === 'moderator',
}

/** Роль человека в сообществе; null — не участник. */
export const roleOf = async (communityId: number, userId: number): Promise<CommunityRole | null> => {
  const member = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true },
  })
  return member ? (member.role as CommunityRole) : null
}

/** Администратор сообщества (создатель тоже администратор). */
export const isCommunityAdmin = async (communityId: number, userId: number): Promise<boolean> =>
  can.configure(await roleOf(communityId, userId))

/** Может публиковать от имени сообщества. */
export const canPublish = async (communityId: number, userId: number): Promise<boolean> =>
  can.publish(await roleOf(communityId, userId))

/** Может следить за порядком: заявки, предложка, блокировки, обсуждения. */
export const canModerate = async (communityId: number, userId: number): Promise<boolean> =>
  can.moderate(await roleOf(communityId, userId))

/** Может править и удалять содержимое сообщества. */
export const canManageContent = async (communityId: number, userId: number): Promise<boolean> =>
  can.manageContent(await roleOf(communityId, userId))

/** Сообщество видно целиком: оно открытое или просматривающий — его участник. */
export const canViewCommunity = async (communityId: number, viewerId?: number): Promise<boolean> => {
  const community = await prisma.community.findUnique({ where: { id: communityId }, select: { isClosed: true } })
  if (!community) return false
  if (!community.isClosed) return true
  if (!viewerId) return false
  return (await roleOf(communityId, viewerId)) !== null
}

/** Участник сообщества (любой роли). */
export const isCommunityMember = async (communityId: number, userId: number): Promise<boolean> =>
  (await roleOf(communityId, userId)) !== null

/** Пользователь в чёрном списке сообщества. */
export const isBanned = async (communityId: number, userId: number): Promise<boolean> =>
  (await prisma.communityBan.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { id: true },
  })) !== null

/** Сообщество закрытое. Для записи без сообщества (null) — нет. */
export const isClosedCommunity = async (communityId: number | null | undefined): Promise<boolean> => {
  if (!communityId) return false
  const community = await prisma.community.findUnique({ where: { id: communityId }, select: { isClosed: true } })
  return !!community?.isClosed
}
