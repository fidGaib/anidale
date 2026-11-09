import { graphql } from '../gql/gql'

export const SIGNOUT = graphql(`
  query SIGNOUT {
    logout
  }
`)

export const REFRESH = graphql(`
  query REFRESH {
    refresh {
      id
      login
      avatar
    }
  }
`)

export const REGISTRATION = graphql(`
  mutation REG($email: String!, $pass: String!, $pass2: String!) {
    registration(user: { email: $email, pass: $pass, pass2: $pass2 }) {
      id
      login
      avatar
      email
    }
  }
`)

export const SIGNIN = graphql(`
  mutation LOGIN($email: String!, $pass: String!) {
    login(user: { email: $email, pass: $pass }) {
      id
      login
      avatar
      email
    }
  }
`)

export const updateUserQuery = graphql(`
  mutation UPDATE_LOGIN($login: String, $avatar: File!) {
    updateUser(user: { login: $login, avatar: $avatar }) {
      login
      avatar
    }
  }
`)
