import { Request, Response } from 'express'
import { GraphQLError } from 'graphql'
import { getCookie, setCookie } from 'typescript-cookie'

import ErrorGraphQL from '../error/GraphQLError'
import ErrorGraphQLMiddleware from '../middleware/ErrorGraphQLMiddleware'
import userServiceGraph from './user-service-graph'

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
  email: string
  pass: string
  login: string
  avatar: string
  activationLink: string
  isActivated: boolean
}
const re =
  /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
class UserControllerGraph {
  async registration(user: Registration, req: Request, res: Response) {
    try {
      const { email, pass, pass2 } = user
      if (!email.trim() || !pass.trim() || !pass2.trim()) {
        throw ErrorGraphQL.badRequest('У вас пустые поля')
      } else if (!email.match(re)) {
        throw ErrorGraphQL.badRequest('Некорректный E-mail')
      } else if (pass !== pass2) {
        throw ErrorGraphQL.badRequest('Пароли не совпадают')
      }
      const userData = await userServiceGraph.registration(email, pass)
      if (userData instanceof GraphQLError) {
        return userData
      }

      setCookie('refreshToken', userData.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      return userData
    } catch (e: any) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async login(user: Login) {
    try {
      const { email, pass } = user
      if (!email.trim() || !pass.trim()) {
        throw ErrorGraphQL.badRequest('У вас пустые поля')
      } else if (!email.match(re)) {
        throw ErrorGraphQL.badRequest('Некорректный E-mail')
      }
      return await userServiceGraph.login(email, pass)
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async fetchOne(id: number) {
    try {
      return await userServiceGraph.getUser(id)
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async fetchMany() {
    try {
      return await userServiceGraph.getUsers()
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async updateUser(id: string, user: UpdateUser) {
    try {
      if (!user.email.match(re)) {
        throw ErrorGraphQL.badRequest('Некорректный E-mail')
      }
      const userData = await userServiceGraph.update(id, user)
      return userData
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
}
export default new UserControllerGraph()
