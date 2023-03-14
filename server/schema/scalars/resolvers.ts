import { dateScalar } from './date'
import { fileScalar } from './file'

const ScalarResolvers = {
  Date: dateScalar,
  FILE: fileScalar,
}

export default ScalarResolvers
