import { Kind } from 'graphql'
import { createGraphQLError } from 'graphql-yoga'

export const dateScalarConfig = {
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.getTime() // Convert outgoing Date to integer for JSON
    }
    throw createGraphQLError('GraphQL Date Scalar serializer expected a `Date` object')
  },
  parseValue(value: any) {
    if (typeof value === 'number') {
      return new Date(value) // Convert incoming integer to Date
    }
    throw createGraphQLError('GraphQL Date Scalar parser expected a `number`')
  },
  parseLiteral(ast: any) {
    if (ast.kind === Kind.INT) {
      // Convert hard-coded AST string to integer and then to Date
      return new Date(parseInt(ast.value, 10))
    }
    // Invalid hard-coded value (not an integer)
    return null
  },
}
