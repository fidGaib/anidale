import NotificationController, { NotificationType } from '@/api/notification/controller'
import prisma from '@/db/db'

/** Уведомляет администраторов и модераторов сообщества (кроме самого автора действия). */
export const notifyAdmins = async (
  communityId: number,
  actorId: number,
  type: NotificationType,
  data: { postId?: number; text?: string } = {},
) => {
  const community = await prisma.community.findUnique({ where: { id: communityId }, select: { name: true } })
  const admins = await prisma.communityMember.findMany({
    where: { communityId, role: { in: ['admin', 'moderator'] }, userId: { not: actorId } },
    select: { userId: true },
  })
  for (const admin of admins) {
    await NotificationController.notify(admin.userId, actorId, type, {
      ...data,
      communityId,
      text: data.text ?? community?.name ?? '',
    })
  }
}
