import { InputMaybe } from '@schema/resolvers-types'
import { createGraphQLError } from 'graphql-yoga'

import { Notice } from '../../db/models/notice-model'

class NoticeService {
  async findAll(limit: number, page: number) {
    const notices = await Notice.findMany({
      take: limit,
      skip: page,
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: true,
      },
    })
    return notices
  }
  async findByUser(id: number, limit: number, page: number) {
    const notices = await Notice.findMany({
      take: limit,
      skip: page,
      where: { userId: id },
      orderBy: { id: 'desc' },
      include: {
        images: true,
        user: true,
      },
    })
    return notices
  }
  //not completed
  async create(owner: number, description: string | null, images: File[] | null) {
    try {
      if (!images?.length && description) {
        const notice = await Notice.create({
          data: {
            userId: owner,
            description,
          },
        })
        return notice
      } else {
        //not completed
        return {}
      }
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async remove(id: number) {
    try {
      await Notice.delete({
        where: {
          id,
        },
      })
      return true
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async update(id: number, description: string, images: File[]) {
    try {
      const newNotice = {
        description,
      }
      const notice = await Notice.update({ where: { id }, data: newNotice, include: { user: true } })
      return notice
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
}
export default new NoticeService()
