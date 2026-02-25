import { compare, hash } from 'bcrypt'
import { createGraphQLError } from 'graphql-yoga'
import { v4 } from 'uuid'

import { storagePath } from '@/config'
import Token from '@/db/models/token-model'
import User from '@/db/models/user-model'

import avatar from '../dtos/avatar-random'
import FileStorageService, { SaveImage } from '../post/file-service'
import tokenService from './token-service'

type UpdateUser = {
  avatar?: File
  email?: string
  isActivated?: boolean
  login?: string
  pass?: string
  activationLink?: String
}
type TypeUser = {
  id: number
  email: string
  pass: string
  login: string
  avatar: string
  activationLink: string | null
  isActivated: boolean
  createdAt: Date
}
// | ----------------> UserService <---------------- |

class UserService {
  // | ----------------> REGISTRATION <---------------- |

  async registration(email: string, pass: string) {
    const candidate = await User.findUnique({ where: { email: email.trim() } })
    if (candidate) throw createGraphQLError('E-mail занят')
    const defaultLogin = Math.round(Math.random() * 99999999)
    const avatar_random = Math.round(Math.random() * avatar.length)
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

  async find(id?: number): Promise<TypeUser | TypeUser[]> {
    if (id) {
      const user = await User.findUnique({
        where: { id },
        include: { posts: true },
      })
      if (!user) throw createGraphQLError('Пользователь не найден')
      return user
    }
    return await User.findMany({
      include: { posts: true },
    })
  }

  // | ----------------> UPDATE USER <---------------- |

  async updateUser(id: number, user: UpdateUser): Promise<{ avatar?: string; login?: string }> {
    // Find User
    const candidate = await User.findUnique({ where: { id } })
    if (!candidate) {
      throw createGraphQLError('Пользователь не найден')
    }
    // Update avatar if provided
    if (user.avatar) {
      const storageService = new FileStorageService(storagePath)
      // Save new avatar
      const [avatarData] = await Promise.all([storageService.saveImage(user.avatar, 'avatars/')])

      const newAvatarPath = avatarData.medium
      try {
        // Check if current avatar is used by other users
        const otherUsersWithSameAvatar = await User.findMany({
          where: {
            avatar: candidate.avatar,
            id: { not: id }, // exclude current user
          },
          select: { id: true },
        })
        // Remove old avatar only if no other users are using it
        if (otherUsersWithSameAvatar.length === 0 && candidate.avatar) {
          await storageService.removeFiles(candidate.avatar)
        }
        // Update user with new avatar
        return await User.update({
          where: { id },
          data: { avatar: newAvatarPath },
          select: {
            avatar: true,
          },
        })
      } catch (error) {
        // In case of error with new avatar, try to remove it to avoid orphaned files
        try {
          await storageService.removeFiles(newAvatarPath)
        } catch (cleanupError) {
          console.warn('Failed to cleanup new avatar after error:', cleanupError)
        }
        throw error
      }
    }
    // Update login if provided
    else if (user.login) {
      return await User.update({
        where: { id },
        data: { login: user.login },
        select: {
          login: true,
        },
      })
    }
    throw createGraphQLError('Не предоставлены данные для обновления')
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
    const tokenFromDB = await Token.findMany({ where: { refreshToken } })
    const userFromDB = await User.findUnique({ where: { id: tokenFromDB[0].userId } })
    if (!tokenFromDB || !userFromDB) throw createGraphQLError('Вы не авторизованы')
    return {
      id: userFromDB.id,
      avatar: userFromDB.avatar,
      login: userFromDB.login,
    }
  }
}
export default new UserService()
