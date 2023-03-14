import { dateScalar } from './date'
import { fileScalar } from './file'

export const ScalarResolvers = {
  Date: dateScalar,
  FILE: fileScalar,
}
