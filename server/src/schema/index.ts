import { makeExecutableSchema } from '@graphql-tools/schema'
import { createYoga } from 'graphql-yoga'

import { Resolvers } from './resolvers-types'

const resolvers = import.meta.glob('./**/*resolvers.ts', { import: 'default', eager: true })

const schemasRaw = import.meta.glob('./**/*schema.graphql', { eager: true, as: 'raw' })

const executableSchema = makeExecutableSchema({
  typeDefs: Object.values(schemasRaw),
  resolvers: Object.values(resolvers) as Resolvers,
})

export const yoga = createYoga({
  schema: executableSchema,
})
