import ErrorGraphQLMiddleware from '../middleware/ErrorGraphQLMiddleware'
import tokenServiceGraph from './token-service-graph'

class TokenControllerGraph {
  async getLifeRefresh() {
    if (!process.env.COOKIE_REFRESH_LIFE) return
    let res = 1
    process.env.COOKIE_REFRESH_LIFE.split('*').forEach((item) => {
      res *= parseInt(item)
    })
    return res
  }
  async find(refreshToken: string) {
    try {
      return await tokenServiceGraph.findToken(refreshToken)
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
}
export default new TokenControllerGraph()
