import { loadFilesSync } from '@graphql-tools/load-files'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'

import { PostResolvers } from './notice/resolvers'
import { UserResolvers } from './user/resolvers'

const executableSchema = makeExecutableSchema({
  typeDefs: loadFilesSync('**/*.graphql'),
  resolvers: [UserResolvers, PostResolvers],
})

export const yoga = createYoga({
  schema: executableSchema,
})
