import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'
import lodash from 'lodash'

import { TokenResolver } from './token/resolvers'
import { TokenSchema } from './token/schema'
import { UserResolvers } from './user/resolvers'
import { UserSchema } from './user/schema'

const { merge } = lodash
const typeDefs = /* GraphQL */ `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`
//объудинение схем
const executableSchema = makeExecutableSchema({
  typeDefs: [typeDefs, UserSchema, TokenSchema],
  resolvers: merge(UserResolvers, TokenResolver),
})
//создание сервера yoga
export const yoga = (req: any, res: any) => {
  return createYoga({
    schema: executableSchema,
    context: { req, res },
  })(req, res)
}
