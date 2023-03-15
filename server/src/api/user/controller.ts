import { createGraphQLError } from 'graphql-yoga'

import UserService from './service'

interface Registration {
  email: string
  pass: string
  pass2: string
}
interface Login {
  email: string
  pass: string
}
interface UpdateUser {
  email?: string
  pass?: string
  login?: string
  avatar?: string
  activationLink?: string
  isActivated?: boolean
}
const re =
  /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
class UserControllerGraph {
  async registration(user: Registration, req: any, res: any) {
    try {
      const { email, pass, pass2 } = user
      if (!email.trim() || !pass.trim() || !pass2.trim()) {
        throw createGraphQLError('У вас пустые поля')
      } else if (!email.match(re)) {
        throw createGraphQLError('Некорректный E-mail')
      } else if (pass !== pass2) {
        throw createGraphQLError('Пароли не совпадают')
      }
      const userData = await UserService.registration(email, pass)

      res.cookie('refreshToken', userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      return {
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        ...userData.user,
      }
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async login(user: Login, req: any, res: any) {
    try {
      const { email, pass } = user
      if (!email.trim() || !pass.trim()) {
        throw createGraphQLError('У вас пустые поля')
      } else if (!email.match(re)) {
        throw createGraphQLError('Некорректный E-mail')
      }
      const userData = await UserService.login(email, pass)
      res.cookie('refreshToken', userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      return {
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        ...userData.user,
      }
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async fetchOne(id: number) {
    try {
      return await UserService.getUser(id)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async fetchMany() {
    try {
      return await UserService.getUsers()
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async updateUser(id: number, user: UpdateUser) {
    try {
      if (!user) return {}
      if (user.email && !user.email.match(re)) {
        throw createGraphQLError('Некорректный E-mail')
      }
      const userData = await UserService.update(id, user)
      return userData
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async remove(id: number) {
    try {
      return await UserService.remove(id)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async logout(refreshToken: string) {
    try {
      return await UserService.logout(refreshToken)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async refresh(req: any, res: any) {
    try {
      const { refreshToken } = req.cookies
      const user = await UserService.refresh(refreshToken)
      res.cookie('refreshToken', user.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      return user
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
}
export default new UserControllerGraph()
