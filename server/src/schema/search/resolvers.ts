import SearchController, { SearchType } from '@/api/search/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { Resolvers, SearchResult } from '@/schema/resolvers-types'

const TYPES: SearchType[] = ['all', 'users', 'posts', 'music', 'communities']

const SearchResolvers: Resolvers = {
  Query: {
    async search(_, { query, type, limit, page }, { req }) {
      const kind = TYPES.find((t) => t === type) ?? 'all'
      return (await SearchController.search(
        query,
        kind,
        limit,
        page,
        await getOptionalUserId(req),
      )) as unknown as SearchResult
    },
  },
}

export default SearchResolvers
