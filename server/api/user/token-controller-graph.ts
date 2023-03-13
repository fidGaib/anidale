import ErrorGraphQLMiddleware from '../middleware/ErrorGraphQLMiddleware'
import tokenServiceGraph from './token-service-graph'

class TokenControllerGraph {
  async find(refreshToken: string) {
    try {
      return await tokenServiceGraph.findToken(refreshToken)
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
}
export default new TokenControllerGraph()
