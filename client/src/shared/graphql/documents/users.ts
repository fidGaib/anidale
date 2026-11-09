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
      work
      education
      about
      website
      birthDate
      backgroundImage
    }
    getFriendState(id: $id) {
      status
      friendsCount
      subscribersCount
      subscriptionsCount
    }
    photosCount(id: $id)
    videosCount(id: $id)
  }
`)

export const UPDATE_PROFILE = graphql(`
  mutation UPDATE_PROFILE(
    $login: String
    $status: String
    $city: String
    $work: String
    $education: String
    $about: String
    $website: String
    $birthDate: Date
  ) {
    updateUser(
      user: {
        login: $login
        status: $status
        city: $city
        work: $work
        education: $education
        about: $about
        website: $website
        birthDate: $birthDate
      }
    ) {
      login
      status
      city
      work
      education
      about
      website
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
      subscriptionsCount
    }
  }
`)

export const UNSUBSCRIBE = graphql(`
  mutation UNSUBSCRIBE($userId: Int!) {
    unsubscribe(userId: $userId) {
      status
      friendsCount
      subscribersCount
      subscriptionsCount
    }
  }
`)

export const GET_FRIENDS_ONLINE = graphql(`
  query GET_FRIENDS_ONLINE($id: Int!, $limit: Int) {
    getFriendsOnline(id: $id, limit: $limit) {
      id
      login
      avatar
    }
  }
`)

export const GET_SUBSCRIPTIONS = graphql(`
  query GET_SUBSCRIPTIONS($id: Int!, $limit: Int, $offset: Int) {
    getSubscriptions(id: $id, limit: $limit, offset: $offset) {
      id
      login
      avatar
    }
  }
`)
