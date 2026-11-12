import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import Token from '@/db/models/token-model'
import User from '@/db/models/user-model'

import avatar from '../dtos/avatar-random'
import FileStorageService from '../post/file-service'
import emailTokenService from './email-token-service'
import mailService from './mail-service'
import passwordService from './password-service'
import tokenService from './token-service'

type UpdateUser = {
  avatar?: File
  backgroundImage?: File
  email?: string
  login?: string
  status?: string
  city?: string
  work?: string
  education?: string
  about?: string
  website?: string
  birthDate?: Date | null
}
// Поля, которые можно отдавать в публичных запросах (без email, пароля и токенов)
export type PublicUser = {
  id: number
  login: string
  avatar: string
  status: string
  city: string
  work: string
  education: string
  about: string
  website: string
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
  work: true,
  education: true,
  about: true,
  website: true,
  birthDate: true,
  backgroundImage: true,
  createdAt: true,
} as const
/** Предельная длина полей блока «Подробнее». */
export const DETAIL_LIMITS = { work: 100, education: 100, about: 500, website: 200 } as const

/** Сайт: только http(s); адрес без схемы дополняется https://. Пустая строка стирает поле. */
export const normalizeWebsite = (value: string): string => {
  const text = value.trim()
  if (!text) return ''
  const isHttp = /^https?:\/\//i.test(text)
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text) && !isHttp) {
    throw createGraphQLError('Сайт должен начинаться с http:// или https://')
  }
  const full = isHttp ? text : `https://${text}`
  return full.slice(0, DETAIL_LIMITS.website)
}

// | ----------------> UserService <---------------- |

class UserService {
  // | ----------------> REGISTRATION <---------------- |

  async registration(email: string, pass: string) {
    const candidate = await User.findUnique({ where: { email: email.trim() } })
    if (candidate) throw createGraphQLError('E-mail занят')
    passwordService.assertStrong(pass, { email })
    const defaultLogin = Math.round(Math.random() * 99999999)
    // Math.floor: индекс от 0 до length - 1; Math.round мог дать length и вернуть undefined
    const avatar_random = Math.floor(Math.random() * avatar.length)
    const hashPass = await passwordService.hash(pass)

    const user = await User.create({
      data: {
        email,
        pass: hashPass,
        isActivated: false,
        login: `bot#` + defaultLogin,
        avatar: avatar[avatar_random],
      },
      select: {
        id: true,
        avatar: true,
        email: true,
        login: true,
        isActivated: true,
      },
    })

    // Письмо не должно ломать регистрацию: если SMTP недоступен, человек сможет отправить его ещё раз
    await this.sendVerificationEmail(user).catch((error) => {
      console.error('Не удалось отправить письмо с подтверждением', error)
    })

    const tokens = await tokenService.generateTokens(user)
    await tokenService.saveToken(user.id, tokens.refreshToken)
    return {
      ...tokens,
      user,
    }
  }

  private async sendVerificationEmail(user: { id: number; email: string; login: string }) {
    const token = await emailTokenService.issue(user.id, 'verify')
    await mailService.sendVerification(user.email, user.login, token)
    void emailTokenService.cleanup()
  }

  /** Повторная отправка письма с подтверждением уже вошедшему пользователю. */
  async resendVerificationEmail(userId: number) {
    const user = await User.findUnique({
      where: { id: userId },
      select: { id: true, email: true, login: true, isActivated: true },
    })
    if (!user) throw createGraphQLError('Пользователь не найден')
    if (user.isActivated) throw createGraphQLError('Почта уже подтверждена')
    await this.sendVerificationEmail(user)
    return true
  }

  /** Переход по ссылке из письма. Ссылка одноразовая, живёт 24 часа. */
  async verifyEmail(token: string) {
    const record = await emailTokenService.findValid(token, 'verify')
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (consumed.count === 0) throw createGraphQLError('Ссылка недействительна или устарела')
      await tx.user.update({ where: { id: record.user.id }, data: { isActivated: true } })
      // Остальные письма «подтвердите почту» больше не нужны
      await tx.emailToken.updateMany({
        where: { userId: record.user.id, type: 'verify', usedAt: null },
        data: { usedAt: new Date() },
      })
    })
    return true
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
        isActivated: true,
      },
    })
    if (!candidate) throw createGraphQLError('Пользователь не найден')
    const isPassEquals = await passwordService.verify(pass, candidate.pass)
    if (!isPassEquals) throw createGraphQLError('Не верный пароль.')
    // Старые bcrypt-хеши незаметно заменяем на Argon2id при следующем входе
    if (passwordService.needsRehash(candidate.pass)) {
      const passHash = await passwordService.hash(pass)
      await User.update({ where: { id: candidate.id }, data: { pass: passHash } })
    }
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
      work?: string
      education?: string
      about?: string
      website?: string
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
      if (typeof user.work === 'string') data.work = user.work.trim().slice(0, DETAIL_LIMITS.work)
      if (typeof user.education === 'string') data.education = user.education.trim().slice(0, DETAIL_LIMITS.education)
      if (typeof user.about === 'string') data.about = user.about.trim().slice(0, DETAIL_LIMITS.about)
      if (typeof user.website === 'string') data.website = normalizeWebsite(user.website)
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
          work: true,
          education: true,
          about: true,
          website: true,
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

  // | ----------------> ПАРОЛЬ <---------------- |

  /**
   * Письмо для восстановления пароля. Ответ всегда успешный, чтобы нельзя было
   * перебором узнать, зарегистрирована ли почта.
   */
  async requestPasswordReset(email: string) {
    const user = await User.findUnique({
      where: { email: email.trim() },
      select: { id: true, email: true, login: true },
    })
    if (!user) return true
    const token = await emailTokenService.issue(user.id, 'reset')
    await mailService.sendPasswordReset(user.email, user.login, token)
    void emailTokenService.cleanup()
    return true
  }

  /** Новый пароль по одноразовой ссылке. Все старые сессии завершаются. */
  async resetPassword(token: string, pass: string, pass2: string) {
    if (!pass || !pass2) throw createGraphQLError('У вас пустые поля')
    if (pass !== pass2) throw createGraphQLError('Пароли не совпадают')
    const record = await emailTokenService.findValid(token, 'reset')
    passwordService.assertStrong(pass, { email: record.user.email, login: record.user.login })
    const passHash = await passwordService.hash(pass)
    await prisma.$transaction(async (tx) => {
      // Ссылку гасим атомарно: два одновременных перехода не должны оба сменить пароль
      const consumed = await tx.emailToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (consumed.count === 0) throw createGraphQLError('Ссылка недействительна или устарела')
      await tx.user.update({
        where: { id: record.user.id },
        // Письмо пришло на почту — значит, адрес принадлежит человеку
        data: { pass: passHash, isActivated: true },
      })
      await tx.token.deleteMany({ where: { userId: record.user.id } })
      await tx.emailToken.updateMany({
        where: { userId: record.user.id, type: 'reset', usedAt: null },
        data: { usedAt: new Date() },
      })
    })
    return true
  }

  /** Смена пароля из настроек: проверяем старый, завершаем остальные сессии и оставляем текущую. */
  async changePassword(userId: number, oldPass: string, pass: string, pass2: string) {
    if (!oldPass || !pass || !pass2) throw createGraphQLError('У вас пустые поля')
    if (pass !== pass2) throw createGraphQLError('Пароли не совпадают')
    const user = await User.findUnique({
      where: { id: userId },
      select: { id: true, email: true, login: true, avatar: true, pass: true },
    })
    if (!user) throw createGraphQLError('Пользователь не найден')
    if (!(await passwordService.verify(oldPass, user.pass))) throw createGraphQLError('Текущий пароль указан неверно')
    if (await passwordService.verify(pass, user.pass)) throw createGraphQLError('Новый пароль должен отличаться от текущего')
    passwordService.assertStrong(pass, { email: user.email, login: user.login })

    const passHash = await passwordService.hash(pass)
    await User.update({ where: { id: userId }, data: { pass: passHash } })
    // Остальные устройства выходят; текущее получает новую сессию
    await tokenService.removeAllForUser(userId)
    const tokens = await tokenService.generateTokens(user)
    await tokenService.saveToken(userId, tokens.refreshToken)
    return tokens
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
      email: tokenData.user.email,
      isActivated: tokenData.user.isActivated,
      role: tokenData.user.role,
      isAdmin: tokenData.user.role === 'admin',
    }
  }
}
export default new UserService()
