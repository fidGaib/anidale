import { AppNotification } from './module'

/** Текст уведомления без имени автора (имя показывается отдельной строкой). */
export const notificationText = (n: AppNotification) => {
  if (n.type === 'comment') return n.text ? `прокомментировал(а) ваш пост: «${n.text}»` : 'прокомментировал(а) ваш пост'
  const name = n.text ? `«${n.text}»` : 'сообщество'
  if (n.type === 'community_request') return `хочет вступить в ${name}`
  if (n.type === 'community_suggest') return `предложил(а) запись в ${name}`
  if (n.type === 'community_invite') return `приглашает вас в сообщество ${name}`
  if (n.type === 'community_accept') {
    return n.postId ? `опубликовал(а) вашу запись в ${name}` : `принял(а) вашу заявку в ${name}`
  }
  if (n.type === 'repost') return 'поделился(ась) вашим постом'
  if (n.type === 'track') return n.text ? `добавил(а) к себе ваш трек «${n.text}»` : 'добавил(а) к себе ваш трек'
  return 'оценил(а) ваш пост'
}
