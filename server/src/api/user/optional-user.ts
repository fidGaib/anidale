import UserService from './service'

/**
 * id пользователя из куки, либо undefined для гостя.
 * В отличие от UserController.refresh не бросает ошибку: нужен там, где запрос открыт всем,
 * а вошедшему добавляются персональные поля (например, «я поставил лайк»).
 */
export const getOptionalUserId = async (req: { cookies?: Record<string, string> }) => {
  const token = req.cookies?.refreshToken
  if (!token) return undefined
  try {
    return (await UserService.refresh(token)).id
  } catch {
    return undefined
  }
}
