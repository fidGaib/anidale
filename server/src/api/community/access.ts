import prisma from '@/db/db'

/** Администратор сообщества (создатель тоже администратор). */
export const isCommunityAdmin = async (communityId: number, userId: number): Promise<boolean> => {
  const member = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true },
  })
  return member?.role === 'admin'
}

/** Сообщество видно целиком: оно открытое или просматривающий — его участник. */
export const canViewCommunity = async (communityId: number, viewerId?: number): Promise<boolean> => {
  const community = await prisma.community.findUnique({ where: { id: communityId }, select: { isClosed: true } })
  if (!community) return false
  if (!community.isClosed) return true
  if (!viewerId) return false
  const member = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: viewerId } },
    select: { id: true },
  })
  return member !== null
}

/** Участник сообщества (любой роли). */
export const isCommunityMember = async (communityId: number, userId: number): Promise<boolean> =>
  (await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { id: true },
  })) !== null

/** Пользователь в чёрном списке сообщества. */
export const isBanned = async (communityId: number, userId: number): Promise<boolean> =>
  (await prisma.communityBan.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { id: true },
  })) !== null
