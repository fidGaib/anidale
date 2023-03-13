import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'

import { TokenResolver } from './token/resolvers'
import { TokenSchema } from './token/schema'
import { UserResolvers } from './user/resolvers'
import { UserSchema } from './user/schema'

// это нужно, чтобы определить заранее эти типы, чтобы потом их можно было расширять
const typeDefs = /* GraphQL */ `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`

// объединение схем
const executableSchema = makeExecutableSchema({
  typeDefs: [typeDefs, UserSchema, TokenSchema],
  resolvers: [UserResolvers, TokenResolver],
})

// создание сервера yoga
export const yoga = createYoga({
  schema: executableSchema,
})
