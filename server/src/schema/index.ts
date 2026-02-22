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
  graphqlEndpoint: '/graphql',
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
})
