import { loadFilesSync } from '@graphql-tools/load-files'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'

import { TokenResolver } from './token/resolvers'
import { UserResolvers } from './user/resolvers'

const executableSchema = makeExecutableSchema({
  typeDefs: loadFilesSync('**/*.graphql'),
  resolvers: [UserResolvers, TokenResolver],
})

export const yoga = createYoga({
  schema: executableSchema,
})
