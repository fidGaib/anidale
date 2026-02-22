import { graphql } from './gql/gql'

export const GET_USERS = graphql(`
  query GET_USERS {
    getUsers {
      id
      login
      avatar
    }
  }
`)
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
export const PROFILE = graphql(`
  query PROFILE($id: Int!) {
    getUser(id: $id) {
      id
      login
      avatar
    }
  }
`)
export const POST_BY_USER = graphql(`
  query POST_BY_USER($id: Int!, $limit: Int!, $page: Int!) {
    getPostsByUser(id: $id, limit: $limit, page: $page) {
      id
      description
      images {
        id
        small
        medium
        type
      }
      user {
        id
        login
        avatar
      }
    }
  }
`)
export const POSTS = graphql(`
  query POSTS($limit: Int!, $page: Int!) {
    getPosts(limit: $limit, page: $page) {
      id
      description
      images {
        id
        small
        medium
        type
      }
      user {
        id
        login
        avatar
      }
    }
  }
`)
export const CREATE_POST = graphql(`
  mutation CREATE_POST($owner: Int!, $description: String, $images: [File!]) {
    createPost(post: { owner: $owner, description: $description, images: $images }) {
      id
      description
      images {
        id
        small
        medium
        type
      }
      user {
        id
        login
        avatar
      }
    }
  }
`)
export const REMOVE_POST = graphql(`
  mutation REMOVE_POST($id: Int!) {
    removePost(id: $id)
  }
`)
