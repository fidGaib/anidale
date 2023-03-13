import { createGraphQLError } from 'graphql-yoga'

import ErrorGraphQL from '../error/GraphQLError'

export default function (err: any) {
  if (err instanceof ErrorGraphQL) {
    return createGraphQLError(err.message)
  }
  return createGraphQLError('Непредвиденная ошибка на сервере.')
}
