import { createGraphQLError } from 'graphql-yoga'
import http from 'http'

import UserController from '../user/controller'

/** Роль администратора сайта: даёт доступ к каталогу аниме. */
export const ADMIN_ROLE = 'admin'

export const isAdminRole = (role?: string | null): boolean => role === ADMIN_ROLE

/**
 * Администратор из куки для мутаций каталога. Проверяем и роль, и подтверждение почты:
 * управлять каталогом может только живой аккаунт.
 */
export const requireAdmin = async (req: http.IncomingMessage & { cookies: Record<string, string> }, res: http.ServerResponse) => {
  const user = await UserController.refresh(res, req.cookies.refreshToken)
  if (!isAdminRole(user.role)) throw createGraphQLError('Нет доступа')
  if (!user.isActivated) throw createGraphQLError('Подтвердите адрес почты')
  return user
}
