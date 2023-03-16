import { GraphQLScalarType } from 'graphql'
import { createGraphQLError } from 'graphql-yoga'

export const fileScalar = new GraphQLScalarType({
  name: 'File',
  description: 'The `File` scalar type represents a file upload.',
  parseValue: (value: unknown) => value,
  parseLiteral: () => {
    throw createGraphQLError('File cannot be passed via literal.')
  },
  serialize: (value: unknown) => value,
})
