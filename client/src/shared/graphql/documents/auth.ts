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
      email
      isActivated
      isAdmin
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
      isActivated
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
      isActivated
    }
  }
`)

export const VERIFY_EMAIL = graphql(`
  mutation VERIFY_EMAIL($token: String!) {
    verifyEmail(token: $token)
  }
`)

export const RESEND_VERIFICATION = graphql(`
  mutation RESEND_VERIFICATION {
    resendVerificationEmail
  }
`)

export const REQUEST_PASSWORD_RESET = graphql(`
  mutation REQUEST_PASSWORD_RESET($email: String!) {
    requestPasswordReset(email: $email)
  }
`)

export const RESET_PASSWORD = graphql(`
  mutation RESET_PASSWORD($token: String!, $pass: String!, $pass2: String!) {
    resetPassword(token: $token, pass: $pass, pass2: $pass2)
  }
`)

export const CHANGE_PASSWORD = graphql(`
  mutation CHANGE_PASSWORD($oldPass: String!, $pass: String!, $pass2: String!) {
    changePassword(oldPass: $oldPass, pass: $pass, pass2: $pass2)
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
