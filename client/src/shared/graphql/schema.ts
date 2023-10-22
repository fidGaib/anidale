import { graphql } from './gql/gql'

graphql(`
  fragment PartUser on User {
    id
    login
    avatar
  }
  fragment PartPost on Post {
    id
    description
    images {
      id
      small
      medium
      type
    }
  }
`)
export const GET_USERS = graphql(`
  query GET_USERS {
    getUsers {
      ...PartUser
    }
  }
`)
export const REFRESH = graphql(`
  query REFRESH {
    refresh {
      user {
        ...PartUser
        email
      }
    }
  }
`)
export const LOGOUT = graphql(`
  query LOGOUT {
    logout
  }
`)
export const REGISTRATION = graphql(`
  mutation REG($email: String!, $pass: String!, $pass2: String!) {
    registration(user: { email: $email, pass: $pass, pass2: $pass2 }) {
      ...PartUser
      email
    }
  }
`)
export const SIGNIN = graphql(`
  mutation LOGIN($email: String!, $pass: String!) {
    login(user: { email: $email, pass: $pass }) {
      ...PartUser
      email
    }
  }
`)
export const UPDATE_USER = graphql(`
  mutation UPDATE_LOGIN($id: Int!, $login: String, $email: String, $pass: String, $old_pass: String, $avatar: [File!]) {
    update(id: $id, user: { login: $login, email: $email, avatar: $avatar }, pass: $pass, old_pass: $old_pass) {
      ...PartUser
      email
    }
  }
`)
export const PROFILE = graphql(`
  query PROFILE($id: Int!) {
    getUser(id: $id) {
      ...PartUser
    }
  }
`)
export const POST_BY_USER = graphql(`
  query POST_BY_USER($id: Int!, $limit: Int!, $page: Int!) {
    getPostsByUser(id: $id, limit: $limit, page: $page) {
      ...PartPost
      user {
        ...PartUser
      }
    }
  }
`)
export const POSTS = graphql(`
  query POSTS($limit: Int!, $page: Int!) {
    getPosts(limit: $limit, page: $page) {
      ...PartPost
      user {
        ...PartUser
      }
    }
  }
`)
export const CREATE_POST = graphql(`
  mutation CREATE_POST($owner: Int!, $description: String, $images: [File!]) {
    createPost(post: { owner: $owner, description: $description, images: $images }) {
      ...PartPost
      user {
        ...PartUser
      }
    }
  }
`)
export const REMOVE_POST = graphql(`
  mutation REMOVE_POST($id: Int!) {
    removePost(id: $id)
  }
`)
