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
      user {
        id
      }
    }
  }
`
export const LOGOUT = gql`
  query {
    logout
  }
`
export const REGISTRATION = gql`
  mutation REG($email: String!, $pass: String!, $pass2: String!) {
    registration(user: { email: $email, pass: $pass, pass2: $pass2 }) {
      id
    }
  }
`
export const SIGNIN = gql`
  mutation LOGIN($email: String!, $pass: String!) {
    login(user: { email: $email, pass: $pass }) {
      id
    }
  }
`
export const PROFILE = (id?: number) => gql`
  query {
    getUser(id: ${id}) {
      login
      avatar
    }
  }
`
