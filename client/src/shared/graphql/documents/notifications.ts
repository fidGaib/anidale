import { graphql } from '../gql/gql'

export const NOTIFICATIONS = graphql(`
  query NOTIFICATIONS($limit: Int!, $beforeId: Int) {
    getNotifications(limit: $limit, beforeId: $beforeId) {
      id
      type
      text
      date
      read
      postId
      communityId
      actor {
        id
        login
        avatar
      }
    }
  }
`)

export const UNREAD_NOTIFICATIONS = graphql(`
  query UNREAD_NOTIFICATIONS {
    unreadNotificationsCount
  }
`)

export const MARK_NOTIFICATIONS_READ = graphql(`
  mutation MARK_NOTIFICATIONS_READ {
    markNotificationsRead
  }
`)
