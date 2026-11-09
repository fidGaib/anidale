import { describe, expect, it } from 'vitest'

import type { AppNotification } from './module'
import { notificationText } from './text'

const make = (type: AppNotification['type'], text = ''): AppNotification => ({
  id: 1,
  type,
  text,
  date: 0,
  read: false,
  postId: 0,
  communityId: 0,
  actor: { id: 1, login: 'anna', avatar: '' },
})

describe('notificationText: текст уведомления без имени автора', () => {
  it('лайк', () => {
    expect(notificationText(make('like'))).toBe('оценил(а) ваш пост')
  })

  it('комментарий с текстом и без', () => {
    expect(notificationText(make('comment', 'круто'))).toBe('прокомментировал(а) ваш пост: «круто»')
    expect(notificationText(make('comment'))).toBe('прокомментировал(а) ваш пост')
  })

  it('трек с названием и без', () => {
    expect(notificationText(make('track', 'Песня'))).toBe('добавил(а) к себе ваш трек «Песня»')
    expect(notificationText(make('track'))).toBe('добавил(а) к себе ваш трек')
  })

  it('репост', () => {
    expect(notificationText(make('repost'))).toBe('поделился(ась) вашим постом')
  })

  it('уведомления о сообществах', () => {
    expect(notificationText(make('community_request', 'Клуб'))).toBe('хочет вступить в «Клуб»')
    expect(notificationText(make('community_suggest', 'Клуб'))).toBe('предложил(а) запись в «Клуб»')
    expect(notificationText(make('community_invite', 'Клуб'))).toBe('приглашает вас в сообщество «Клуб»')
    expect(notificationText(make('community_accept', 'Клуб'))).toBe('принял(а) вашу заявку в «Клуб»')
    expect(notificationText({ ...make('community_accept', 'Клуб'), postId: 5 })).toBe(
      'опубликовал(а) вашу запись в «Клуб»',
    )
    expect(notificationText(make('community_request'))).toBe('хочет вступить в сообщество')
  })
})
