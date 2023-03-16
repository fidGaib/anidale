import { gql } from '@apollo/client'

export const GET_USERS = gql`
  query {
    getUsers {
      id
      login
      avatar
    }
  }
`
export const REFRESH = gql`
  query {
    refresh {
      accessToken
    }
  }
`
export const PROFILE = gql`
  query {
    getUser(id: id) {
      login
      avatar
    }
  }
`
