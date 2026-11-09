import { AppNotification } from './module'

/** Текст уведомления без имени автора (имя показывается отдельной строкой). */
export const notificationText = (n: AppNotification) => {
  if (n.type === 'comment') return n.text ? `прокомментировал(а) ваш пост: «${n.text}»` : 'прокомментировал(а) ваш пост'
  if (n.type === 'repost') return 'поделился(ась) вашим постом'
  if (n.type === 'track') return n.text ? `добавил(а) к себе ваш трек «${n.text}»` : 'добавил(а) к себе ваш трек'
  return 'оценил(а) ваш пост'
}
