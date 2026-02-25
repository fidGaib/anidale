// import ArtsController from '@/api/art/controller'
// import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const ArtResolvers: Resolvers = {
  Query: {
    async getArts(_, args) {},
    async getArtsByUser(_, args) {},
  },
  Mutation: {
    async createArt(_, { images }, ctx) {},
  },
}
export default ArtResolvers
