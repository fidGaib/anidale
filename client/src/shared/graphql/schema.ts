import { gql } from '@apollo/client'

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
export const REFRESH = graphql(`
  query REFRESH {
    refresh {
      accessToken
      user {
        id
        login
        avatar
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
      id
      login
      avatar
    }
  }
`)
export const SIGNIN = graphql(`
  mutation LOGIN($email: String!, $pass: String!) {
    login(user: { email: $email, pass: $pass }) {
      id
      login
      avatar
    }
  }
`)
export const PROFILE = graphql(`
  query PROFILE($id: Int!) {
    getUser(id: $id) {
      login
      avatar
    }
  }
`)
export const POST_BY_USER = gql(`
  query POST_BY_USER($id: Int!, $limit: Int!, $page: Int!) {
    getPostsByUser(id: $id, limit: $limit, page: $page) {
      id
      description
      images {
        id
        small
        type
      }
      user {
        id
        avatar
        login
      }
    }
  }
`)
export const POSTS = graphql(`
  query POSTS($limit: Int!, $page: Int!) {
    getPosts(limit: $limit, page: $page) {
      id
      description
      user {
        id
        avatar
        login
      }
    }
  }
`)
export const CREATE_POST = gql(`
  mutation CREATE_POST($owner: Int!, $description: String, $images: [File!]) {
    createPost(post: { owner: $owner, description: $description, images: $images }) {
      id
      description
      images{
        id
        small
        medium
        type
      }
      user {
        id
        avatar
        login
      }
    }
  }
`)
export const REMOVE_POST = graphql(`
  mutation REMOVE_POST($id: Int!) {
    removePost(id: $id)
  }
`)
