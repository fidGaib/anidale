import { loadFilesSync } from '@graphql-tools/load-files'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'

// import { PostResolvers } from './notice/resolvers'
// import { ScalarResolvers } from './scalars/resolvers'
// import { UserResolvers } from './user/resolvers'

const executableSchema = makeExecutableSchema({
  typeDefs: loadFilesSync('**/*.graphql'),
  resolvers: loadFilesSync('./**/*resolvers.ts'),
  // resolvers: [UserResolvers, PostResolvers, ScalarResolvers],
})

export const yoga = createYoga({
  schema: executableSchema,
})
