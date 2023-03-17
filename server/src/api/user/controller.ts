import { Request, Response } from 'express'
import { createGraphQLError } from 'graphql-yoga'

import { Login, Registration, UpdateUser } from '@/schema/resolvers-types'

import UserService from './service'

const emailRegex =
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
class UserControllerGraph {
  async registration(user: Registration, req: Request, res: Response) {
    try {
      const { email, pass, pass2 } = user
      if (!email.trim() || !pass.trim() || !pass2.trim()) {
        throw createGraphQLError('У вас пустые поля')
      } else if (!email.match(emailRegex)) {
        throw createGraphQLError('Некорректный E-mail')
      } else if (pass !== pass2) {
        throw createGraphQLError('Пароли не совпадают')
      }
      const userData = await UserService.registration(email.trim(), pass.trim())

      res.cookie('refreshToken', userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      res.cookie('accessToken', userData.accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
      })
      return {
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        ...userData.user,
      }
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async login(user: Login, req: Request, res: Response) {
    try {
      const { email, pass } = user
      if (!email.trim() || !pass.trim()) {
        throw createGraphQLError('У вас пустые поля')
      } else if (!email.match(emailRegex)) {
        throw createGraphQLError('Некорректный E-mail')
      }
      const userData = await UserService.login(email.trim(), pass.trim())
      res.cookie('refreshToken', userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      res.cookie('accessToken', userData.accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
      })
      return {
        accessToken: userData.accessToken,
        refreshToken: userData.refreshToken,
        ...userData.user,
      }
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async fetchOne(id: number) {
    try {
      return await UserService.getUser(id)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async fetchMany() {
    try {
      return await UserService.getUsers()
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async updateUser(id: number, user?: UpdateUser) {
    try {
      if (!user) return {}
      if (user.email && !user.email.match(emailRegex)) {
        throw createGraphQLError('Некорректный E-mail')
      }

      user.email = user.email ?? undefined

      const userData = await UserService.update(id, user)
      return userData
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async remove(id: number) {
    try {
      return await UserService.remove(id)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.cookies
      return await UserService.logout(refreshToken)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.cookies
      const user = await UserService.refresh(refreshToken)
      res.cookie('refreshToken', user.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      res.cookie('accessToken', user.accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
      })
      return user
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
}
export default new UserControllerGraph()
