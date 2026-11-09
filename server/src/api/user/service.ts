import { compare, hash } from 'bcrypt'
import { createGraphQLError } from 'graphql-yoga'
import { v4 } from 'uuid'

import { storagePath } from '@/config'
import Token from '@/db/models/token-model'
import User from '@/db/models/user-model'

import avatar from '../dtos/avatar-random'
import FileStorageService from '../post/file-service'
import tokenService from './token-service'

type UpdateUser = {
  avatar?: File
  backgroundImage?: File
  email?: string
  isActivated?: boolean
  login?: string
  pass?: string
  status?: string
  city?: string
  birthDate?: Date | null
  activationLink?: string
}
// Поля, которые можно отдавать в публичных запросах (без email, пароля и токенов)
export type PublicUser = {
  id: number
  login: string
  avatar: string
  status: string
  city: string
  birthDate: Date | null
  backgroundImage: string
  createdAt: Date
}
export const publicUserSelect = {
  id: true,
  login: true,
  avatar: true,
  status: true,
  city: true,
  birthDate: true,
  backgroundImage: true,
  createdAt: true,
} as const
// | ----------------> UserService <---------------- |

class UserService {
  // | ----------------> REGISTRATION <---------------- |

  async registration(email: string, pass: string) {
    const candidate = await User.findUnique({ where: { email: email.trim() } })
    if (candidate) throw createGraphQLError('E-mail занят')
    const defaultLogin = Math.round(Math.random() * 99999999)
    // Math.floor: индекс от 0 до length - 1; Math.round мог дать length и вернуть undefined
    const avatar_random = Math.floor(Math.random() * avatar.length)
    const hashPass = await hash(pass + process.env.PASS_PEPPER, 10)
    const activationLink = v4()

    const user = await User.create({
      data: {
        email,
        pass: hashPass,
        activationLink,
        isActivated: false,
        login: `bot#` + defaultLogin,
        avatar: avatar[avatar_random],
      },
      select: {
        id: true,
        avatar: true,
        email: true,
        login: true,
      },
    })

    const tokens = await tokenService.generateTokens(user)
    await tokenService.saveToken(user.id, tokens.refreshToken)
    return {
      ...tokens,
      user,
    }
  }
  // | ----------------> LOGIN <---------------- |

  async login(email: string, pass: string) {
    const candidate = await User.findUnique({
      where: { email },
      select: {
        pass: true,
        id: true,
        avatar: true,
        email: true,
        login: true,
      },
    })
    if (!candidate) throw createGraphQLError('Пользователь не найден')
    const isPassEquals = await compare(pass + process.env.PASS_PEPPER, candidate.pass)
    if (!isPassEquals) throw createGraphQLError('Не верный пароль.')
    const tokens = await tokenService.generateTokens(candidate)
    await tokenService.saveToken(candidate.id, tokens.refreshToken)
    return {
      ...tokens,
      user: candidate,
    }
  }

  // | ----------------> GET User <---------------- |

  async find(id?: number): Promise<PublicUser | PublicUser[]> {
    if (id) {
      const user = await User.findUnique({
        where: { id },
        select: publicUserSelect,
      })
      if (!user) throw createGraphQLError('Пользователь не найден')
      return user
    }
    return await User.findMany({
      select: publicUserSelect,
      orderBy: { id: 'asc' },
    })
  }

  /** Список пользователей с постраничной выдачей и поиском по логину. */
  async list(limit?: number | null, offset?: number | null, search?: string | null) {
    const take = Math.min(Math.max(limit ?? 50, 1), 100)
    const skip = Math.max(offset ?? 0, 0)
    const needle = search?.trim()
    return await User.findMany({
      select: publicUserSelect,
      where: needle ? { login: { contains: needle, mode: 'insensitive' } } : undefined,
      orderBy: { id: 'asc' },
      take,
      skip,
    })
  }

  // | ----------------> UPDATE USER <---------------- |

  async updateUser(id: number, user: UpdateUser) {
    // Find User
    const candidate = await User.findUnique({ where: { id } })
    if (!candidate) {
      throw createGraphQLError('Пользователь не найден')
    }

    const storageService = new FileStorageService(storagePath)
    const data: {
      avatar?: string
      backgroundImage?: string
      login?: string
      status?: string
      city?: string
      birthDate?: Date | null
    } = {}
    let newAvatarPath: string | undefined
    let newCoverPath: string | undefined

    try {
      // Аватар
      if (user.avatar) {
        const avatarData = await storageService.saveImage(user.avatar, 'avatars/')
        newAvatarPath = avatarData.medium
        data.avatar = newAvatarPath
      }
      // Обложка профиля
      if (user.backgroundImage) {
        const coverData = await storageService.saveImage(user.backgroundImage, 'covers/')
        // Нативный saveImage не заполняет high: лучшее доступное качество лежит в medium
        newCoverPath = coverData.medium
        data.backgroundImage = newCoverPath
      }
      // Текстовые поля профиля
      if (typeof user.login === 'string' && user.login.trim()) data.login = user.login.trim()
      if (typeof user.status === 'string') data.status = user.status.trim()
      if (typeof user.city === 'string') data.city = user.city.trim()
      // Дату рождения можно стереть, передав null
      const birthDate = user.birthDate as Date | null | undefined
      if (birthDate === null) data.birthDate = null
      else if (birthDate) data.birthDate = birthDate instanceof Date ? birthDate : new Date(birthDate)

      if (Object.keys(data).length === 0) {
        throw createGraphQLError('Не предоставлены данные для обновления')
      }

      const updated = await User.update({
        where: { id },
        data,
        select: {
          id: true,
          login: true,
          avatar: true,
          status: true,
          city: true,
          birthDate: true,
          backgroundImage: true,
        },
      })

      // Старые файлы удаляем только после успешного обновления записи
      if (newAvatarPath && candidate.avatar && candidate.avatar !== newAvatarPath) {
        // Аватар по умолчанию может использоваться другими пользователями
        const otherUsersWithSameAvatar = await User.count({
          where: { avatar: candidate.avatar, id: { not: id } },
        })
        if (otherUsersWithSameAvatar === 0) {
          await storageService.removeFiles(candidate.avatar).catch((cleanupError) => {
            console.warn('Failed to remove old avatar:', cleanupError)
          })
        }
      }
      if (newCoverPath && candidate.backgroundImage && candidate.backgroundImage !== newCoverPath) {
        await storageService.removeFiles(candidate.backgroundImage).catch((cleanupError) => {
          console.warn('Failed to remove old cover:', cleanupError)
        })
      }

      return updated
    } catch (error) {
      // Не оставляем осиротевшие файлы, если запись не обновилась
      if (newAvatarPath) await storageService.removeFiles(newAvatarPath).catch(() => undefined)
      if (newCoverPath) await storageService.removeFiles(newCoverPath).catch(() => undefined)
      throw error
    }
  }

  // | ----------------> REMOVE USER <---------------- |
  async remove(id: number) {
    const user = await User.findUnique({
      where: {
        id,
      },
    })
    if (!user) throw createGraphQLError('Пользователь не найден')
    await Token.deleteMany({
      where: {
        userId: id,
      },
    })
    await User.delete({
      where: {
        id,
      },
    })
    return true
  }

  // | ----------------> LOGOUT <---------------- |

  async logout(refreshToken: string) {
    return await tokenService.removeToken(refreshToken)
  }

  // | ----------------> REFRESH <---------------- |

  async refresh(refreshToken: string) {
    if (!refreshToken) throw createGraphQLError('Вы не авторизованы')
    // Один запрос вместо двух: токен вместе с пользователем
    const tokenData = await tokenService.findToken(refreshToken)
    if (!tokenData?.user) throw createGraphQLError('Вы не авторизованы')
    return {
      id: tokenData.user.id,
      avatar: tokenData.user.avatar,
      login: tokenData.user.login,
    }
  }
}
export default new UserService()
