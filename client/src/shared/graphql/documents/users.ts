import { graphql } from '../gql/gql'

export const GET_USERS = graphql(`
  query GET_USERS($limit: Int, $offset: Int, $search: String) {
    getUsers(limit: $limit, offset: $offset, search: $search) {
      id
      login
      avatar
    }
  }
`)

export const PROFILE = graphql(`
  query PROFILE($id: Int!) {
    getUser(id: $id) {
      id
      login
      avatar
      status
      city
      birthDate
      backgroundImage
    }
    getFriendState(id: $id) {
      status
      friendsCount
      subscribersCount
    }
    photosCount(id: $id)
    videosCount(id: $id)
  }
`)

export const UPDATE_PROFILE = graphql(`
  mutation UPDATE_PROFILE($login: String, $status: String, $city: String, $birthDate: Date) {
    updateUser(user: { login: $login, status: $status, city: $city, birthDate: $birthDate }) {
      login
      status
      city
      birthDate
    }
  }
`)

export const UPDATE_COVER = graphql(`
  mutation UPDATE_COVER($backgroundImage: File!) {
    updateUser(user: { backgroundImage: $backgroundImage }) {
      backgroundImage
    }
  }
`)

export const GET_FRIENDS = graphql(`
  query GET_FRIENDS($id: Int!, $limit: Int, $offset: Int) {
    getFriends(id: $id, limit: $limit, offset: $offset) {
      id
      login
      avatar
    }
  }
`)

export const GET_SUBSCRIBERS = graphql(`
  query GET_SUBSCRIBERS($id: Int!, $limit: Int, $offset: Int) {
    getSubscribers(id: $id, limit: $limit, offset: $offset) {
      id
      login
      avatar
    }
  }
`)

export const SUBSCRIBE = graphql(`
  mutation SUBSCRIBE($userId: Int!) {
    subscribe(userId: $userId) {
      status
      friendsCount
      subscribersCount
    }
  }
`)

export const UNSUBSCRIBE = graphql(`
  mutation UNSUBSCRIBE($userId: Int!) {
    unsubscribe(userId: $userId) {
      status
      friendsCount
      subscribersCount
    }
  }
`)
