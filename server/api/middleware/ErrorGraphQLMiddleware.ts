import { createGraphQLError } from 'graphql-yoga'

import ErrorGrapgQl from '../error/GraphQLError'

export default function (err: any) {
  if (err instanceof ErrorGrapgQl) {
    return createGraphQLError(err.message)
  }
  return createGraphQLError('Непредвиденная ошибка на сервере.')
}
