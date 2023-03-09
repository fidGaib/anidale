import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'
import { resolvers as UserResolvers, typeDefs as User } from './user/user.js'
import lodash from 'lodash'
import { resolvers as PostResolvers, typeDefs as Post } from './posts/posts.js'
const { merge } = lodash
const typeDefs = /* GraphQL */ `
  type Query {
    _empty: String # корневой запрос должен что-то иметь, так можно обмануть граф
  }
`
const resolvers = {}
const executableSchema = makeExecutableSchema({
  typeDefs: [typeDefs, User, Post],
  resolvers: merge(resolvers, UserResolvers, PostResolvers),
})
export const yoga = createYoga({
  schema: executableSchema,
})
