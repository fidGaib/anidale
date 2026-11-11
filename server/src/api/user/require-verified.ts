import { createGraphQLError } from 'graphql-yoga'
import http from 'http'

import UserController from './controller'

/**
 * Пользователь из куки, которому разрешено писать.
 * Читать и ставить лайки можно и без подтверждения почты, а публикации,
 * комментарии, сообщения и вступление в сообщества — только после него.
 */
export const requireVerifiedUser = async (
  req: http.IncomingMessage & { cookies: Record<string, string> },
  res: http.ServerResponse,
) => {
  const user = await UserController.refresh(res, req.cookies.refreshToken)
  if (!user.isActivated) {
    throw createGraphQLError('Подтвердите адрес почты, чтобы публиковать записи, комментарии и сообщения')
  }
  return user
}
