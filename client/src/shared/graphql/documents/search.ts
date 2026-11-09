import { graphql } from '../gql/gql'

export const SEARCH = graphql(`
  query SEARCH($query: String!, $type: String, $limit: Int!, $page: Int!) {
    search(query: $query, type: $type, limit: $limit, page: $page) {
      usersTotal
      postsTotal
      musicTotal
      users {
        id
        login
        avatar
      }
      posts {
        id
        description
        date
        likesCount
        commentsCount
        user {
          id
          login
          avatar
        }
        images {
          id
          high
          small
          medium
          saved
        }
        videos {
          id
          title
          file
          size
          type
          postId
          saved
        }
      }
      music {
        id
        title
        artist
        file
        size
        user {
          id
          login
        }
      }
    }
  }
`)
